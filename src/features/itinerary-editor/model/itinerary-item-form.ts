import { z } from "@/shared/lib/zod";

const coordinateSchema = (label: string, minimum: number, maximum: number) =>
  z
    .string(`${label}를 입력해 주세요.`)
    .trim()
    .min(1, `${label}를 입력해 주세요.`)
    .refine((value) => Number.isFinite(Number(value)), `${label}는 숫자여야 합니다.`)
    .refine(
      (value) => Number(value) >= minimum && Number(value) <= maximum,
      `${label}는 ${minimum}에서 ${maximum} 사이여야 합니다.`,
    );

export const itineraryItemFormSchema = z.object({
  name: z
    .string("장소 이름을 입력해 주세요.")
    .trim()
    .min(1, "장소 이름을 입력해 주세요.")
    .max(160, "장소 이름은 160자 이내로 입력해 주세요."),
  address: z
    .string("주소를 입력해 주세요.")
    .trim()
    .min(1, "주소를 입력해 주세요.")
    .max(300, "주소는 300자 이내로 입력해 주세요."),
  category: z.string("카테고리를 입력해 주세요.").trim().max(80, "카테고리는 80자 이내로 입력해 주세요."),
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
  longitude: coordinateSchema("장소 검색 결과", -180, 180),
  latitude: coordinateSchema("장소 검색 결과", -90, 90),
});

export type ItineraryItemFormValues = z.infer<typeof itineraryItemFormSchema>;
