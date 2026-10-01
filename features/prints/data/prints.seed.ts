import type { Print } from "@/features/prints/domain/entities";

/**
 * Printed products, in the order they're shown. Sizes are standard photo sizes
 * in inches; prices are not listed (they change with paper and frame stock),
 * so every product asks for a quote on WhatsApp. When this moves to Supabase,
 * this file becomes the seed for the `prints` table.
 */
export const prints: Print[] = [
  {
    slug: "premium-albums",
    mockup: "album",
    previewFilmIds: ["2thTrQR3pec", "Rk2D0cbQK34"],
    featured: true,
    name: "Premium wedding albums",
    nameNe: "प्रिमियम एल्बम",
    icon: "BookHeart",
    serviceType: "Photo album design and printing",
    highlight: "Designed layouts, thick pages",
    summary:
      "Designed albums with thick pages and a finished cover, made from your wedding or ceremony photos to last for generations.",
    intro: [
      "An album is how most families actually look at their wedding photos: years later, on the sofa, with the relatives who weren't there. We choose and arrange your best photos into a designed layout that follows the day in order, and have it bound as a premium album.",
      "Albums work for pasni, bratabandha and pre-wedding shoots too, often as a smaller book.",
    ],
    optionsHeading: "Things to decide",
    options: [
      { label: "Size and shape", detail: "Landscape or square; bigger albums suit wedding spreads, smaller ones make good gifts for parents" },
      { label: "Number of pages", detail: "Depends on how many photos you want in; we'll suggest a count from your selection" },
      { label: "Cover", detail: "A photo cover, or a plain cover with your names" },
      { label: "Copies", detail: "A second, smaller copy for parents or in-laws is a popular gift" },
    ],
    sections: [
      {
        heading: "How we make your album",
        items: [
          "You pick your favourite photos, or leave the choice to us",
          "We design the layout, spread by spread, in the order of the day",
          "You check the design and ask for changes",
          "We print and bind it, and call you when it's ready",
        ],
      },
      {
        heading: "Photos from another photographer?",
        body: "Bring them on a pen drive and ask us: we can design an album from photos you already have.",
      },
    ],
    faqs: [
      {
        question: "How much does an album cost?",
        answer: "It depends on the size, the number of pages and the cover. Tell us what you have in mind and we'll send a quote.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about a premium photo album.",
  },
  {
    slug: "photo-frames",
    mockup: "frame",
    previewFilmIds: ["tlucLNe7aQI"],
    featured: true,
    name: "Photo frames",
    nameNe: "फोटो फ्रेम",
    icon: "Frame",
    serviceType: "Photo framing",
    highlight: "5×7 to 20×30 in",
    summary:
      "Your photo printed and framed, ready for the wall or a table: wedding portraits, family groups and collages in standard sizes.",
    intro: [
      "A framed photo is the one you see every day. We print your photo and frame it in the studio, from a small frame for a table or a gift to a large portrait for the living room wall.",
    ],
    optionsHeading: "Common sizes",
    options: [
      { label: "5×7 in", detail: "Table frames and gifts" },
      { label: "8×10 in", detail: "Desks, shelves and small walls" },
      { label: "8×12 in", detail: "The same shape as a camera photo, so nothing is cropped" },
      { label: "12×18 in", detail: "Wall portraits for bedrooms and hallways" },
      { label: "16×24 in", detail: "The main wedding portrait in a living room" },
      { label: "20×30 in", detail: "A large feature wall" },
    ],
    sections: [
      {
        heading: "Good for",
        items: [
          "The main wedding portrait",
          "A family group photo from a ceremony or a festival",
          "A collage of pasni or birthday photos",
          "A gift for parents or in-laws",
          "A portrait of a late family member for the home",
        ],
      },
      {
        heading: "Printing a photo from your phone",
        body: "Send it on WhatsApp as a document, not as a photo: WhatsApp shrinks photos, which shows up in a big print. For a large frame, send the original from the camera if you have it.",
      },
    ],
    faqs: [
      {
        question: "Do you have other sizes?",
        answer: "Ask us. Tell us the size and where the frame will hang and we'll tell you what we can make.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to frame a photo. Size: ",
  },
  {
    slug: "canvas-prints",
    mockup: "canvas",
    previewFilmIds: ["GTBeZRAIcWQ"],
    featured: true,
    name: "Canvas prints",
    nameNe: "क्यानभास प्रिन्ट",
    icon: "Image",
    serviceType: "Canvas printing",
    highlight: "No glass, no glare",
    summary:
      "Photos printed on canvas and stretched over a frame: no glass and no glare, with a painting-like finish for large wall pieces.",
    intro: [
      "Canvas suits a big, simple photo: a couple portrait, a baby's face, a landscape from home. With no glass there's no reflection, so it reads from anywhere in the room.",
    ],
    optionsHeading: "Common sizes",
    options: [
      { label: "12×18 in", detail: "A single portrait in a bedroom or hallway" },
      { label: "16×24 in", detail: "Above a sofa or a bed" },
      { label: "20×30 in", detail: "The main piece on a large wall" },
    ],
    sections: [
      {
        heading: "Canvas or a framed print?",
        items: [
          "Canvas: no glass, no glare and a soft texture. Best for one or two people and bold, simple photos.",
          "Framed print behind glass: sharper fine detail. Better for big family groups where every face matters.",
        ],
      },
      {
        heading: "Which photos work best",
        body: "Choose a photo that's sharp and well lit, with the faces reasonably large in the frame. A small face in a wide group photo doesn't get better when it's printed big.",
      },
    ],
    faqs: [
      {
        question: "Can you make a canvas from an old photo?",
        answer: "Bring it in and we'll look at it together. Whether it prints well at a large size depends on the original.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about a canvas print. Size: ",
  },
  {
    slug: "photo-prints",
    mockup: "loose-prints",
    previewFilmIds: ["xZHzDT7CFSs", "nqMUJ7J7qTg", "Rk2D0cbQK34"],
    featured: false,
    name: "Photo prints",
    nameNe: "फोटो प्रिन्ट",
    icon: "Printer",
    serviceType: "Photo printing",
    highlight: "4×6 to 12×18 in",
    summary: "Prints from your camera or phone in standard sizes, from 4×6 in keepsakes to 12×18 in enlargements.",
    intro: [
      "Most photos now live on phones and never get printed. Send us the ones worth keeping and we'll print them in the size you need, for an album at home, a school project or a gift.",
    ],
    optionsHeading: "Sizes",
    options: [
      { label: "4×6 in", detail: "The classic print for albums and envelopes" },
      { label: "5×7 in", detail: "Table frames and cards" },
      { label: "6×8 in", detail: "Fits phone photos (4:3) without cropping" },
      { label: "8×10 in", detail: "Frames and certificates; crops a camera photo slightly" },
      { label: "8×12 in", detail: "Fits camera photos (3:2) without cropping" },
      { label: "12×18 in", detail: "Enlargements and posters" },
    ],
    sections: [
      {
        heading: "Sending us your photos",
        items: [
          "WhatsApp: send them as a document, not as a photo, so they aren't compressed",
          "Pen drive or memory card: bring it to the studio",
          "Tell us the size and how many copies of each",
        ],
      },
      {
        heading: "Which size fits your photo",
        body: "Camera photos are 3:2, so 4×6, 8×12 and 12×18 print them whole. Phone photos are usually 4:3, which fits 6×8. Other sizes crop a little from the edges; we'll check before printing.",
      },
    ],
    faqs: [
      {
        question: "Can you print from Facebook or Instagram?",
        answer:
          "We can, but those copies are small and compressed, so they only print well at small sizes. Ask the person who took the photo for the original if you can.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like some photos printed.",
  },
  {
    slug: "photo-books",
    mockup: "book",
    previewFilmIds: ["QZtJ6EMi_vk"],
    featured: false,
    name: "Photo books",
    nameNe: "फोटो बुक",
    icon: "BookImage",
    serviceType: "Photo book printing",
    highlight: "Small, giftable keepsakes",
    summary:
      "Smaller printed books for a pre-wedding shoot, a pasni or a family trip: a lighter keepsake than a full album, and an easy gift.",
    intro: [
      "Not every occasion needs a full wedding album. A photo book holds the best photos of a pre-wedding shoot, a baby's pasni or a family trip in something small enough to post to relatives abroad.",
    ],
    optionsHeading: "Good for",
    options: [
      { label: "Pre-wedding shoots", detail: "Pages from your couple shoot, often shown at the wedding" },
      { label: "Pasni and first birthdays", detail: "A baby's first year in one small book" },
      { label: "Family gatherings", detail: "Dashain, Tihar and the visits of relatives from abroad" },
      { label: "Gifts", detail: "Extra copies for grandparents and relatives" },
    ],
    sections: [
      {
        heading: "How to order",
        items: ["Send or bring your photos", "Tell us the occasion and how many copies", "We lay out the pages and print"],
      },
    ],
    faqs: [
      {
        question: "What's the difference from a premium album?",
        answer:
          "A premium album is larger, with thick pages and a finished cover, made to last as the family's wedding record. A photo book is smaller and lighter: a keepsake or a gift.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about a photo book.",
  },
];
