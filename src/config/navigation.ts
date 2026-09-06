// src/config/navigation.ts

export interface NavItem {
  name: string;
  path: string;
}

export interface WhatsAppConfig {
  channelUrl: string;
  desktopLabel: string;
  mobileLabel: string;
  trustLabel: string;
}

export interface TelegramConfig {
  channelUrl: string;
  desktopLabel: string;
  mobileLabel: string;
  trustLabel: string;
}

export const navItems: NavItem[] = [
  { name: "Latest Deals", path: "/" },
  { name: "Live Alerts",  path: "/livedeals" },
  { name: "Quick Commerce", path: "/quick-commerce" },
  { name: "Blog",         path: "/blog" },
  { name: "About",        path: "/about" },
];

export const whatsAppConfig: WhatsAppConfig = {
  channelUrl:   "https://whatsapp.com/channel/0029Vb81sJqGk1FxL7t9lW0h",
  desktopLabel: "Join WhatsApp Channel",
  mobileLabel:  "Get Instant WhatsApp Alerts",
  trustLabel:   "100k+ shoppers. Zero spam. Free forever.",
};

export const telegramConfig: TelegramConfig = {
  channelUrl:   "https://t.me/DealsHubIndia",
  desktopLabel: "Join Telegram Channel",
  mobileLabel:  "Join Telegram Alerts",
  trustLabel:   "15k+ hunters. Instant drops. Zero delay.",
};
