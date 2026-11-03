/** Publiczne stałe marki (bezpieczne dla klienta). */
export const SITE = {
  name: "Elofik",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://elofik.com").replace(/\/$/, ""),
  sloganPl: "Elofik — codziennie jedno mądre słowo",
  sloganEn: "Elofik — Little stories. Big words.",
  description:
    "Personalizowane bajki audio dla dzieci 4–7 lat. Każdego dnia jedna nowa przygoda z Elofikiem, jedno mądre słowo i historia, w której Twoje dziecko słyszy własne imię oraz imiona bliskich.",
  supportEmail: "pomoc@elofik.com",
};
