"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import "yet-another-react-lightbox/styles.css";

interface GalleryPhoto {
  alt: string;
  height: number;
  src: string;
  title: string;
  width: number;
}

export function InfluencerGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState(-1);

  return (
    <>
      <MasonryPhotoAlbum
        defaultContainerWidth={1120}
        onClick={({ index: nextIndex }) => setIndex(nextIndex)}
        photos={photos}
        spacing={16}
      />
      <Lightbox
        close={() => setIndex(-1)}
        index={index}
        open={index >= 0}
        slides={photos.map((photo) => ({ src: photo.src, title: photo.title, alt: photo.alt }))}
      />
    </>
  );
}
