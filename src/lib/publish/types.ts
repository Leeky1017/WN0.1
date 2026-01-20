export type PublishPlatform = 'wechat' | 'zhihu' | 'xiaohongshu' | 'toutiao' | 'medium';

export type PublishFormat = 'text' | 'markdown' | 'html';

export type PublishInput = {
  title: string;
  markdown: string;
};

export type PublishOptions = {
  stripLinks?: boolean;
};

export type PublishResult = {
  platform: PublishPlatform;
  format: PublishFormat;
  content: string;
  warnings: string[];
};

