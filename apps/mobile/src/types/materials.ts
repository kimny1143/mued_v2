export interface Material {
  id: string;
  title: string;
  content: string;
  link: string;
  pubDate: string;
  creator: string;
  thumbnail?: string;
  readingTime?: string;
  category: string;
}

export interface Magazine {
  id: string;
  name: string;
  url: string;
  category: string;
  color: string;
  bgColor: string;
}

export const magazines: Magazine[] = [
  { 
    id: 'recording',
    name: '録音教材',
    url: 'https://note.com/mued_glasswerks/m/m6c6d04036790/rss',
    category: '録音',
    color: '#ef4444',
    bgColor: '#fee2e2'
  },
  { 
    id: 'composition',
    name: '作曲教材',
    url: 'https://note.com/mued_glasswerks/m/me618d465f0ef/rss',
    category: '作曲',
    color: '#3b82f6',
    bgColor: '#dbeafe'
  },
  { 
    id: 'lyrics',
    name: '作詞教材',
    url: 'https://note.com/mued_glasswerks/m/m4f79b7131ae7/rss',
    category: '作詞',
    color: '#10b981',
    bgColor: '#d1fae5'
  }
];