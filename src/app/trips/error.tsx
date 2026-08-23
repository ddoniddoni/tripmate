"use client";

import { useRouter } from "next/navigation";

export default function TripsError() {
  const router = useRouter();

  return (
    <main className="trips-page error-page">
      <section className="error-card" aria-labelledby="trips-error-heading">
        <span className="eyebrow">여행</span>
        <h1 id="trips-error-heading">여행을 불러오지 못했어요.</h1>
        <p>문제가 계속되면 로그인 상태를 확인한 뒤 내 여행 목록에서 다시 확인해 주세요.</p>
        <button type="button" onClick={() => router.replace("/trips")}>
          내 여행으로 가기
        </button>
      </section>
    </main>
  );
}
