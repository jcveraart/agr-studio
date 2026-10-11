// Organizer information checked 11 October 2026. Route totals are provisional.
// This is an independent training tool; it is not an official AGR or JOIN product.
const accessed = '2026-10-11';
const provisional = {
  en: 'Organizer-published route figure; subject to change. Final 2027 route/GPX not verified.',
  nl: 'Routecijfer van de organisator; onder voorbehoud. Definitieve route/GPX voor 2027 niet geverifieerd.'
};

export const RACE = {
  name: 'Amstel Gold Race Toerversie 2027',
  date: '2027-04-17',
  timezone: 'Europe/Amsterdam',
  location: 'Valkenburg, South Limburg, Netherlands',
  locationLabel: { en: 'Valkenburg · South Limburg', nl: 'Valkenburg · Zuid-Limburg' },
  dateStatus: { en: 'Confirmed by the organizer', nl: 'Bevestigd door de organisator' },
  type: { en: 'Sportive · open-road touring event', nl: 'Toerversie · prestatietocht op de openbare weg' },
  routeStatus: provisional,
  distances: [
    {
      km: 65, elevationM: 600, elevationStatus: provisional,
      description: { en: 'The shortest option, with Geulhemmerberg, Sibbergrubbe and Cauberg on the published route.', nl: 'De kortste afstand, met Geulhemmerberg, Sibbergrubbe en Cauberg in de gepubliceerde route.' },
      startWindow: '08:30–11:00', sourceUrl: 'https://www.amstel.nl/agr-65-km',
      climbs: ['Geulhemmerberg', 'Maasberg', 'Lange Raarberg', 'Sibbergrubbe', 'Cauberg']
    },
    {
      km: 100, elevationM: 920, elevationStatus: provisional,
      description: { en: 'A longer northern loop adds Bergseweg, Fromberg and Koulenberg.', nl: 'Een langere noordelijke lus met onder andere Bergseweg, Fromberg en Koulenberg.' },
      startWindow: '08:00–11:00', sourceUrl: 'https://www.amstel.nl/agr-100-km',
      climbs: ['Geulhemmerberg', 'Maasberg', 'Lange Raarberg', 'Bergseweg', 'Fromberg', 'Koulenberg', 'Sibbergrubbe', 'Cauberg']
    },
    {
      km: 125, elevationM: 1135, elevationStatus: provisional,
      description: { en: 'More time in the saddle, including Sweikhuizerberg and the northern hills.', nl: 'Meer kilometers in het zadel, met Sweikhuizerberg en de noordelijke heuvels.' },
      startWindow: '07:30–11:00', sourceUrl: 'https://www.amstel.nl/agr-125-km',
      climbs: ['Geulhemmerberg', 'Maasberg', 'Lange Raarberg', 'Sweikhuizerberg', 'Bergseweg', 'Fromberg', 'Koulenberg', 'Sibbergrubbe', 'Cauberg']
    },
    {
      km: 150, elevationM: 1920, elevationStatus: provisional,
      description: { en: 'A demanding hill route featuring Camerig, Vaalserberg, Eyserbosweg and Keutenberg.', nl: 'Een stevige heuvelroute met Camerig, Vaalserberg, Eyserbosweg en Keutenberg.' },
      startWindow: '07:00–11:00', sourceUrl: 'https://www.amstel.nl/agr-150-km',
      climbs: ['Geulhemmerberg', 'Bemelerberg', 'Heiweg', 'Bukel', 'Loorberg', 'Schweiberg', 'Camerig', 'Vaalserberg', 'Gemmenicherweg', 'Epenerbaan', 'Kruisberg', 'Eyserbosweg', 'Bergseweg', 'Fromberg', 'Keutenberg', 'Cauberg']
    },
    {
      km: 200, elevationM: 1986, elevationStatus: provisional,
      description: { en: 'A long endurance day linking northern loops with Eyserbosweg, Keutenberg and Cauberg.', nl: 'Een lange duurdag die noordelijke lussen verbindt met Eyserbosweg, Keutenberg en Cauberg.' },
      startWindow: '06:30–09:00', sourceUrl: 'https://www.amstel.nl/agr-200-km',
      climbs: ['Geulhemmerberg', 'Maasberg', 'Lange Raarberg', 'Sweikhuizerberg', 'Bergseweg', 'Fromberg', 'Koulenberg', 'Bemelerberg', 'Heiweg', 'Bukel', 'Loorberg', 'Eyserbosweg', 'Schanternelsweg', 'Keutenberg', 'Cauberg']
    },
    {
      km: 240, elevationM: 2715, elevationStatus: provisional,
      description: { en: 'The longest option: sustained endurance plus repeated hills through the Limburg landscape.', nl: 'De langste afstand: een grote duuruitdaging met herhaalde beklimmingen in het Limburgse landschap.' },
      startWindow: '06:30–09:00', sourceUrl: 'https://www.amstel.nl/agr-240-km',
      climbs: ['Geulhemmerberg', 'Maasberg', 'Lange Raarberg', 'Sweikhuizerberg', 'Bergseweg', 'Fromberg', 'Koulenberg', 'Bemelerberg', 'Heiweg', 'Bukel', 'Loorberg', 'Schweiberg', 'Camerig', 'Vaalserberg', 'Gemmenicherweg', 'Epenerbaan', 'Kruisberg', 'Eyserbosweg', 'Schanternelsweg', 'Keutenberg', 'Cauberg']
    }
  ],
  climbs: [
    { name: 'Cauberg', note: { en: 'Listed on all six published route options.', nl: 'Vermeld bij alle zes gepubliceerde afstanden.' } },
    { name: 'Geulhemmerberg', note: { en: 'Listed on all six published route options.', nl: 'Vermeld bij alle zes gepubliceerde afstanden.' } },
    { name: 'Eyserbosweg', note: { en: 'Listed on the 150, 200 and 240 km routes.', nl: 'Vermeld bij de routes van 150, 200 en 240 km.' } },
    { name: 'Keutenberg', note: { en: 'Listed on the 150, 200 and 240 km routes.', nl: 'Vermeld bij de routes van 150, 200 en 240 km.' } },
    { name: 'Camerig', note: { en: 'Listed on the 150 and 240 km routes.', nl: 'Vermeld bij de routes van 150 en 240 km.' } },
    { name: 'Vaalserberg', note: { en: 'Listed on the 150 and 240 km routes.', nl: 'Vermeld bij de routes van 150 en 240 km.' } }
  ],
  registration: {
    opens: '2026-10-01', closes: '2026-10-31',
    status: { en: 'Registration window: 1–31 October 2026. Places allocated by lottery; confirm current availability with the organizer.', nl: 'Inschrijfperiode: 1–31 oktober 2026. Plaatsen worden verloot; controleer actuele beschikbaarheid bij de organisator.' },
    url: 'https://atleta.cc/e/ulVqtS9Baj1g',
    infoUrl: 'https://www.amstel.nl/amstelgoldrace/inschrijven-2026',
    lottery: { en: 'First lottery: week 45 of 2026. A second lottery is planned in week 48; eligible unsuccessful applicants can use the exchange from early February 2027.', nl: 'Eerste loting: week 45 van 2026. Een tweede loting volgt in week 48; in aanmerking komende uitgelote inschrijvers kunnen vanaf begin februari 2027 het ruilsysteem gebruiken.' }
  },
  facts: {
    en: [
      'The amateur Toerversie is on Saturday 17 April 2027; the professional race follows on Sunday.',
      'Start: Shimano Experience Center, De Leeuwhof 2, Valkenburg. Finish: Valkenburg aan de Geul.',
      'Choose 65, 100, 125, 150, 200 or 240 km. Published routes and ascent totals may change.',
      'This is a sportive, not a competition. Traffic rules apply throughout.',
      'Minimum age: 18. A helmet and a roadworthy bicycle are required.',
      'Route support includes feed stops, Shimano technical assistance and medical provision.'
    ],
    nl: [
      'De Toerversie is op zaterdag 17 april 2027; de profwedstrijd volgt op zondag.',
      'Start: Shimano Experience Center, De Leeuwhof 2, Valkenburg. Finish: Valkenburg aan de Geul.',
      'Kies 65, 100, 125, 150, 200 of 240 km. Gepubliceerde routes en hoogtemeters kunnen wijzigen.',
      'Dit is een prestatietocht, geen wedstrijd. Verkeersregels blijven van toepassing.',
      'Minimumleeftijd: 18 jaar. Een helm en een deugdelijke fiets zijn verplicht.',
      'Onderweg zijn verzorgingsposten, technische ondersteuning van Shimano en medische verzorging.'
    ]
  },
  preparation: {
    en: [
      'Bring ID and the collection email when collecting your rider pack.',
      'Published collection times: Friday 16 April 12:00–21:00, Saturday 17 April 06:00–10:30. Recheck your final participant email.',
      'Check the suggested start window for your distance and leave time to collect your rider pack.',
      'Keep the number, handlebar plate and wristband visible; follow stewards and traffic rules.',
      'Use the official organizer ticket exchange if you cannot attend.',
      'Recheck the organizer instructions before departure: feed-stop locations are confirmed closer to the event.'
    ],
    nl: [
      'Neem legitimatie en de afhaalmail mee als je de startbescheiden ophaalt.',
      'Gepubliceerde afhaaltijden: vrijdag 16 april 12:00–21:00, zaterdag 17 april 06:00–10:30. Controleer de definitieve deelnemersmail.',
      'Controleer het geadviseerde startvenster voor jouw afstand en neem tijd voor het ophalen.',
      'Draag nummer, stuurbordje en polsbandje zichtbaar; volg verkeersregelaars en verkeersregels.',
      'Gebruik het officiële ticketruilsysteem als je niet kunt deelnemen.',
      'Controleer voor vertrek de organisatoreninformatie: locaties van verzorgingsposten volgen kort voor het evenement.'
    ]
  },
  sources: [
    { title: 'Official Toerversie overview', url: 'https://www.amstel.nl/toerversie?lang=nl', accessed },
    { title: 'Official 2027 FAQ', url: 'https://www.amstel.nl/amstelgoldrace/toerversie/vraag-en-antwoord', accessed },
    { title: 'Registration and lottery', url: 'https://www.amstel.nl/vragen-over-de-loting', accessed },
    { title: 'Participation and practical information', url: 'https://www.amstel.nl/vragen-over-jouw-deelname', accessed },
    { title: 'Participation terms', url: 'https://www.amstel.nl/amstelgoldrace/belangrijke-informatie', accessed },
    ...[65, 100, 125, 150, 200, 240].map(km => ({ title: `Official ${km} km route`, url: `https://www.amstel.nl/agr-${km}-km`, accessed }))
  ]
};
