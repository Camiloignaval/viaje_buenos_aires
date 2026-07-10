import { sendEmail } from '../sendEmail.js';
import { TripReadyEmail } from '../../../src/email/index.js';

export async function sendTripReadyEmail({ email, name, destination, startDate, endDate, tripUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: `Tu viaje a ${destination} ya está listo`,
    template: TripReadyEmail,
    props: { name, destination, startDate, endDate, tripUrl, appUrl },
  });
}
