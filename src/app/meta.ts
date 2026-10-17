export function setMeta(title: string, description: string): void {
  document.title = title.includes('PanRouter') ? title : `${title} | PanRouter`;
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'description';
    document.head.appendChild(tag);
  }
  tag.content = description;
}
