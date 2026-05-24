/** Raw row scraped from a Betway Scores league/competition upcomings page. */
export type BetwayListingRawFixture = {
  betwayMatchId: string;
  betwaySlug: string;
  betwayHref: string;
  dateHeading: string;
  cardText: string;
  homeTeam: string;
  awayTeam: string;
};

export type BetwayListingParsedFixture = BetwayListingRawFixture & {
  date?: string;
  kickoffIso?: string;
  group?: string;
  stage?: string;
};
