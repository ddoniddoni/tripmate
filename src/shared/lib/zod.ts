import { z } from "zod";

// All validation errors are presented to Korean-speaking TripMate users.
z.config(z.locales.ko());

export { z };
