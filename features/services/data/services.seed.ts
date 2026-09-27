import type { Service } from "@/features/services/domain/entities";

/**
 * The studio's services, in the order they're shown. Content rules (CLAUDE.md §7):
 * no invented prices, turnaround times, counts or reviews; anything the studio
 * hasn't confirmed is phrased as "ask us". When this moves to Supabase, this file
 * becomes the seed for the `services` table.
 */
export const services: Service[] = [
  {
    slug: "wedding-photography",
    shortName: "Wedding photos",
    coverFilmId: "2thTrQR3pec",
    name: "Wedding photography",
    nameNe: "विवाह फोटोग्राफी",
    icon: "Heart",
    featured: true,
    serviceType: "Wedding photography",
    summary:
      "Every ritual of a Nepali wedding photographed in order, from the janti and swayambar to sindur, kanyadan and the bidaai.",
    intro: [
      "A Nepali wedding runs across a long day, often two, and its most important rituals happen once and quickly. We photograph the whole day and the family around it, so your photos tell the story in the order it happened: getting ready, the janti arriving, the swayambar, the rituals at the mandap and the bidaai.",
      "We cover weddings at homes, party palaces and temples across Syangja. The films on this page are from weddings we've shot recently.",
    ],
    sections: [
      {
        heading: "Moments we photograph",
        items: [
          "Getting ready: the bride's dressing and mehendi, the groom's family preparing",
          "The janti arriving with panchebaja, and the welcome at the bride's home",
          "Swayambar and the exchange of garlands",
          "Kanyadan, sindur and pote, and the seven steps around the fire",
          "Tika and blessings from elders, and group photos of both families",
          "The bidaai, and the welcome at the groom's home",
          "Reception, dancing and the guests",
        ],
      },
      {
        heading: "What you can take home",
        items: [
          "Edited photos of the whole day",
          "A premium album designed from your photos",
          "Framed and canvas prints of your favourite portraits",
          "A full wedding film and a highlight video, if you add video",
        ],
      },
      {
        heading: "Help us plan your day",
        body: "Send us the schedule (with the sait times for each ritual) about a week before, and name one relative who knows both families to help gather people for group photos. If your family or community has a ritual we might not expect, tell us so we're in the right place when it happens.",
      },
    ],
    faqs: [
      {
        question: "How early should we book?",
        answer:
          "As soon as your date is fixed. Wedding-season dates fill first. Message us your date and venue and we'll tell you whether we're free.",
      },
      {
        question: "How much does wedding photography cost?",
        answer:
          "It depends on the hours, how many photographers and videographers you need, and whether you add a film, an album or frames. Send us your date, venue and what you'd like, and we'll send you a quote.",
      },
      {
        question: "Can you cover both the bride's and the groom's side?",
        answer: "Tell us the venues and timings on each side and we'll plan the coverage with you.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about wedding photography. Our date is: ",
    filmCategory: "weddings",
    relatedPrints: ["premium-albums", "photo-frames", "canvas-prints"],
  },
  {
    slug: "wedding-films",
    shortName: "Wedding films",
    coverFilmId: "Rk2D0cbQK34",
    name: "Wedding films",
    nameNe: "विवाह भिडियो",
    icon: "Clapperboard",
    featured: true,
    serviceType: "Wedding videography",
    summary:
      "A full-length film of your wedding and a short highlight to share, edited with music and titled with your names.",
    intro: [
      "Alongside the photos, we film the wedding and edit it into something the whole family can watch together again: a full-length film that follows the day in order, and a highlight video of a few minutes to share.",
      "Our full wedding films are long enough to include every ritual: Keshav and Anita's runs well over two hours. Relatives in Nepal and abroad watch them on our YouTube channel.",
    ],
    sections: [
      {
        heading: "What a wedding film can include",
        items: [
          "The full film, following every ritual of the day in order",
          "A highlight video of a few minutes, cut to music",
          "A title design with your names and wedding date",
          "Short clips sized for Facebook and phone screens",
        ],
      },
      {
        heading: "Watching and sharing",
        body: "With your permission we publish the film on our YouTube channel, so family anywhere can watch it the same way. Tell us if you'd rather keep it off YouTube, and ask us for the video files to keep.",
      },
    ],
    faqs: [
      {
        question: "Can we see your films first?",
        answer: "Yes. Every film we publish is on our Films page and on our YouTube channel.",
      },
      {
        question: "Can we book only a highlight video?",
        answer: "Tell us what you need, whether that's the full film, a highlight or both, and we'll quote for it.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about a wedding film. Our date is: ",
    filmCategory: "weddings",
    relatedPrints: ["premium-albums"],
  },
  {
    slug: "pre-wedding-shoots",
    shortName: "Pre-wedding shoots",
    coverFilmId: null,
    name: "Pre-wedding and couple shoots",
    nameNe: "प्रि-वेडिङ सुट",
    icon: "Flower2",
    featured: false,
    serviceType: "Engagement photography",
    summary:
      "A relaxed shoot for the two of you before the wedding, outdoors or in the studio, for invitations, save-the-dates and your walls.",
    intro: [
      "A pre-wedding shoot is the calm part of the wedding: an hour or two for just the two of you, without a schedule or a crowd. It's also practice: by the wedding day you're used to the camera.",
      "The photos go on your invitation cards and save-the-date posts, and the best one often ends up framed at home.",
    ],
    sections: [
      {
        heading: "Where to shoot",
        items: [
          "A place that means something to you: your village, a temple, the fields or hills nearby",
          "Our studio, for clean portraits in any weather",
          "Both: a few studio portraits, then outside while the light is soft",
        ],
      },
      {
        heading: "What to wear",
        body: "Bring two outfits if you can: something traditional (daura suruwal, sari or gunyu cholo) and something you'd wear on a day out. Plain colours photograph better than busy prints.",
      },
      {
        heading: "Where the photos go",
        items: ["Wedding invitation cards", "Save-the-date posts", "A framed print or canvas for home", "A small photo book"],
      },
    ],
    faqs: [
      {
        question: "When should we do it?",
        answer: "A few weeks before the wedding, so there's time to use the photos on your invitations.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, we'd like to ask about a pre-wedding shoot.",
    filmCategory: null,
    relatedPrints: ["photo-books", "canvas-prints", "photo-frames"],
  },
  {
    slug: "family-ceremonies",
    shortName: "Pasni and bratabandha",
    coverFilmId: "tlucLNe7aQI",
    name: "Pasni, bratabandha and family ceremonies",
    nameNe: "पास्नी, ब्रतबन्ध र पारिवारिक समारोह",
    icon: "Flame",
    featured: true,
    serviceType: "Event photography",
    summary:
      "Pasni, bratabandha, chaurasi puja and other family ceremonies, photographed and filmed with every ritual in order.",
    intro: [
      "Family ceremonies are smaller than a wedding but just as important, and many of them happen once in a lifetime. We photograph and film them the same way: every ritual in order, and every part of the family in the pictures.",
      "Recent ceremonies we've filmed include a pasni in Walling, a bratabandha in Tirasi and a chaurasi puja in Panchamul.",
    ],
    sections: [
      {
        heading: "Pasni (rice feeding)",
        body: "A baby's first taste of rice, usually in the fifth or sixth month. We photograph the baby being dressed, the first feeding by the family, tika and blessings from the elders, and the moment the baby picks from the tray of objects, the photo every family wants.",
      },
      {
        heading: "Bratabandha",
        body: "The coming-of-age ceremony when a boy receives the sacred thread (janai). The shaving of the head, the saffron robes, the teaching from the guru, the round of bhiksha from relatives and the moment his mama brings him back all make strong photos, and they happen fast.",
      },
      {
        heading: "Chaurasi puja and elders' celebrations",
        body: "Chaurasi puja marks an elder reaching 84, about a thousand full moons. The whole extended family comes together for it, so we make sure every branch of the family gets its group photo with them.",
      },
      {
        heading: "Birthdays, anniversaries and pujas",
        body: "Smaller gatherings too: a first birthday, a wedding anniversary, a house puja. Tell us what's planned and for how long.",
      },
    ],
    faqs: [
      {
        question: "How much does it cost?",
        answer:
          "It depends on the length of the ceremony and whether you want photos, a film or both. Send us the date, the place and what's planned, and we'll send a quote.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about photos for a family ceremony (pasni / bratabandha / puja). The date is: ",
    filmCategory: "ceremonies",
    relatedPrints: ["photo-frames", "photo-books", "photo-prints"],
  },
  {
    slug: "studio-portraits",
    shortName: "Portraits",
    coverFilmId: "GTBeZRAIcWQ",
    name: "Studio portraits and family photos",
    nameNe: "स्टुडियो पोर्ट्रेट र पारिवारिक फोटो",
    icon: "Users",
    featured: true,
    serviceType: "Portrait photography",
    summary:
      "Portraits in our studio in Arjunchaupari: families, couples, children, graduates and profile photos, printed and ready to frame.",
    intro: [
      "Some photos are worth making on purpose: the whole family together while relatives are home for Dashain or Tihar, a child's first birthday, a graduate in their gown, a portrait of your parents.",
      "Come to the studio and we'll take care of the light, the background and the posing, then print your favourites to frame.",
    ],
    sections: [
      {
        heading: "Who comes in",
        items: [
          "Families, especially when relatives are visiting from abroad",
          "Couples and newly-weds",
          "Babies and children",
          "Graduates and students",
          "Expecting mothers",
          "Profile photos for CVs and applications",
        ],
      },
      {
        heading: "Take it home",
        body: "Most portraits end up on a wall. We print and frame in the studio, from a small table frame to a large canvas.",
      },
    ],
    faqs: [
      {
        question: "Do we need an appointment?",
        answer: "It's best to call or message before you come, especially for a large family group, so we're ready for you.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to book a studio portrait session.",
    filmCategory: null,
    relatedPrints: ["photo-frames", "canvas-prints", "photo-prints"],
  },
  {
    slug: "events-and-culture",
    shortName: "Events and culture",
    coverFilmId: "xZHzDT7CFSs",
    name: "Events, programmes and cultural shows",
    nameNe: "कार्यक्रम तथा सांस्कृतिक प्रस्तुति",
    icon: "PartyPopper",
    featured: false,
    serviceType: "Event photography",
    summary:
      "School and community programmes, engagements, receptions, panchebaja and cultural performances, photographed and filmed on location.",
    intro: [
      "Beyond family occasions, we photograph and film the events that bring a village or an organisation together, and the music that goes with them. Our panchebaja film from Arjunchaupari is one example.",
    ],
    sections: [
      {
        heading: "Events we cover",
        items: [
          "School programmes and prize days",
          "Community, cooperative and organisation meetings",
          "Engagements and receptions",
          "Panchebaja, naumati baja and local singers",
          "Cultural programmes and performances",
        ],
      },
      {
        heading: "What you receive",
        items: ["Edited photos of the event", "An event film or a short highlight", "Clips for your organisation's Facebook page"],
      },
    ],
    faqs: [
      {
        question: "Can you cover events outside Arjunchaupari?",
        answer: "We film across Syangja. Tell us the place and date and we'll let you know.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I'd like to ask about coverage for an event. The date and place are: ",
    filmCategory: "culture",
    relatedPrints: ["photo-prints"],
  },
  {
    slug: "passport-photos",
    shortName: "Passport photos",
    coverFilmId: null,
    name: "Passport, visa and ID photos",
    nameNe: "पासपोर्ट साइज फोटो",
    icon: "IdCard",
    featured: false,
    serviceType: "Passport photo service",
    summary:
      "Passport-size and ID photos taken and printed in the studio, the same day. Walk-in friendly.",
    intro: [
      "Need photos for a citizenship certificate, a licence, a visa, or a job or school application? Come to the studio: we take the photo, set it to the size the form asks for, and print it the same day.",
    ],
    sections: [
      {
        heading: "Bring the requirement with you",
        body: "Sizes and rules differ between forms and countries, and embassies change them. Bring the exact requirement (the page from the form or the embassy's website) and we'll match it: size, background colour and how much of the face should fill the frame.",
      },
      {
        heading: "What to wear",
        items: [
          "Clothes that stand out from a white or light background",
          "Hair away from the face; many forms ask for both ears visible",
          "No glasses, unless the form allows them",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I get a digital copy for an online form?",
        answer: "Ask for the digital file when you come in, and tell us the size in pixels or kilobytes the website asks for.",
      },
    ],
    inquiry: "Hello Sunrise Photo Studio, I need passport / ID photos.",
    filmCategory: null,
    relatedPrints: ["photo-prints"],
  },
];
