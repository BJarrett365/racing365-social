import { withAppPathPrefix } from "@/app/lib/app-base-path";

export function libraryFileUrl(rel: string) {
  return withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`);
}

export function libraryDownloadUrl(rel: string) {
  return withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}&download=1`);
}

export function libraryNewsShortsBackdropVideoHref(rel: string) {
  return `${withAppPathPrefix("/news-shorts")}?backdropVideo=${encodeURIComponent(rel)}`;
}

export function libraryNewsShortsBackdropImageHref(rel: string) {
  return `${withAppPathPrefix("/news-shorts")}?backdropImage=${encodeURIComponent(rel)}`;
}
