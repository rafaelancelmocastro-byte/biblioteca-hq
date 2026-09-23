declare module "foliate-js/view.js" {
  export function makeBook(file: File | Blob | string): Promise<unknown>;
}
declare module "foliate-js/comic-book.js" {
  export function makeComicBook(loader: unknown, file: File): Promise<unknown>;
}
