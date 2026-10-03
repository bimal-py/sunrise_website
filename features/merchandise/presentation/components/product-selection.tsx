"use client";

import { createContext, use, useState, type ReactNode } from "react";

type PhotoOnShow = { imageIndex: number; showImage: (index: number) => void };

const PhotoContext = createContext<PhotoOnShow>({ imageIndex: 0, showImage: () => {} });

/**
 * The photo on show, shared by the gallery (thumbnails, swipes) and the options beside it
 * (choosing a variant shows its photo). Wraps server-rendered content; only this index is state.
 */
export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const [imageIndex, showImage] = useState(0);
  return <PhotoContext value={{ imageIndex, showImage }}>{children}</PhotoContext>;
}

export function usePhotoOnShow(): PhotoOnShow {
  return use(PhotoContext);
}
