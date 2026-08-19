import {
  placeSnapshotSchema,
  type PlaceSnapshot,
} from "@/entities/place/model/place-snapshot";
import { z } from "@/shared/lib/zod";

export const itineraryItemFormSchema = z.object({
  place: z.union([placeSnapshotSchema, z.null()]),
  name: z.string().trim().max(160, "장소 이름은 160자 이내로 입력해 주세요."),
  address: z.string().trim().max(300, "주소는 300자 이내로 입력해 주세요."),
  category: z.string().trim().max(80, "카테고리는 80자 이내로 입력해 주세요."),
  startTime: z
    .string()
    .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm 형식의 시간을 입력해 주세요."),
  durationMinutes: z
    .string()
    .regex(/^$|^\d+$/, "소요 시간은 분 단위 정수여야 합니다.")
    .refine(
      (value) => value === "" || (Number(value) >= 1 && Number(value) <= 1_440),
      "소요 시간은 1분에서 1440분 사이여야 합니다.",
    ),
  note: z.string("메모를 입력해 주세요.").trim().max(2_000, "메모는 2,000자 이내로 입력해 주세요."),
});

export type ItineraryItemFormFields = z.infer<typeof itineraryItemFormSchema>;

export type ItineraryItemFormValues = Omit<ItineraryItemFormFields, "place"> & {
  place: PlaceSnapshot;
};
