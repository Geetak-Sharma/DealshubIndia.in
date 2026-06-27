export function OrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DealsHub India",
    "url": "https://dealshubindia.in"
  };
}

export function BlogPostingSchema(post: { headline: string; image: string; datePublished: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.headline,
    "image": post.image,
    "datePublished": post.datePublished,
    "publisher": OrganizationSchema()
  };
}

export function BreadcrumbSchema(items: Array<{ name: string; item: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.item
    }))
  };
}
