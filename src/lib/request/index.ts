
import { AppError, ErrorType } from '../errors';
import { logger } from '../observability';
import { Cache, type CacheOptions } from '../cache';

interface PipelineOptions<T, DTO> {
  key: string;
  fetcher: () => Promise<T>;
  validator?: (data: T) => boolean;
  mapper?: (data: T) => DTO;
  timeoutMs?: number;
  retries?: number;
  cacheOptions?: CacheOptions;
}

export const executePipeline = async <T, DTO = T>(options: PipelineOptions<T, DTO>): Promise<DTO> => {
  const { key, fetcher, validator, mapper, timeoutMs = 5000, retries = 0, cacheOptions } = options;

  const attemptFetch = async (currentAttempt: number): Promise<DTO> => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const rawData = await Promise.race([
        fetcher(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new AppError(ErrorType.TIMEOUT, 'Request timed out')));
        })
      ]);
      clearTimeout(id);

      if (validator && !validator(rawData)) {
        throw new AppError(ErrorType.VALIDATION_ERROR, 'Data validation failed');
      }

      const dto = mapper ? mapper(rawData) : (rawData as unknown as DTO);
      logger.metric('pipeline.success.latency', performance.now() - start, { key });
      return dto;

    } catch (err: any) {
      if (currentAttempt < retries) {
        logger.warn(`Pipeline retry ${currentAttempt + 1} for ${key}`);
        return attemptFetch(currentAttempt + 1);
      }
      
      const errorType = err instanceof AppError ? err.type : ErrorType.PLATFORM_FAILURE;
      logger.error('Pipeline failed', err, { key });
      throw new AppError(errorType, err.message || 'Unknown pipeline failure', { key });
    }
  };

  if (cacheOptions) {
    return Cache.wrap(key, () => attemptFetch(0), cacheOptions);
  }

  return attemptFetch(0);
};
