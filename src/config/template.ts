/**
 * The Google Sheet template that people copy to plan their trip
 */
const TEMPLATE_ID = '1vx0FWu5zmdzHatcLx4ZkxGPp4sdbuDkPIDovCp1lei8';

/**
 * A public sheet with a made-up trip to try the app with, including the flights to and from it.
 * It is a copy of the template with fixed values instead of formulas, so it never uses any quota.
 */
export const SAMPLE_SHEET_ID = '1Td_qAVfp4PauwQKY3MSXqOID1bp7i-34D9ia2alWbUU';

/** Opens the template to look at it */
export const TEMPLATE_URL = `https://docs.google.com/spreadsheets/d/${TEMPLATE_ID}/edit?gid=747783443#gid=747783443`;

/** Google asks to make a copy in your own Drive instead of opening the original */
export const TEMPLATE_COPY_URL = `https://docs.google.com/spreadsheets/d/${TEMPLATE_ID}/copy`;
