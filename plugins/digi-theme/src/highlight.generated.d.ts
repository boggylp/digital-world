declare const hljs: {
  highlight: (code: string, options: { language: string; ignoreIllegals?: boolean }) => { value: string };
  getLanguage: (name: string) => object | undefined;
};

export default hljs;
