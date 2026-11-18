declare const languages: ReadonlySet<string>;

declare const tokenize: (code: string, lang: string) => { content: string; color?: string }[][];

export { languages, tokenize };
