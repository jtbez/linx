import type { Infer } from "@vinejs/vine/types";
import { Factoid as FactoidSchema, Source as SourceSchema } from "../../schemas/factoid/index.js";

type Factoid = Infer<typeof FactoidSchema>;
type Source = Infer<typeof SourceSchema>;

export type { Factoid, Source }
