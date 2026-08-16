import {
  placeSnapshotSchema,
  type PlaceSnapshot,
} from "@/entities/place/model/place-snapshot";
import { z } from "@/shared/lib/zod";

export const placeSuggestionFormSchema = z.object({
  note: z
    .string("제안 메모를 입력해 주세요.")
    .trim()
    .max(500, "제안 메모는 500자 이내로 입력해 주세요."),
  place: z.union([placeSnapshotSchema, z.null()]),
});

export type PlaceSuggestionFormFields = z.infer<typeof placeSuggestionFormSchema>;

export type PlaceSuggestionFormValues = {
  note: string;
  place: PlaceSnapshot;
};
