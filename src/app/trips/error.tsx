"use client";

type TripsErrorProps = {
  reset: () => void;
};

export default function TripsError({ reset }: TripsErrorProps) {
  return (
    <main className="trips-page error-page">
      <section className="error-card" aria-labelledby="trips-error-heading">
        <span className="eyebrow">여행</span>
        <h1 id="trips-error-heading">여행을 불러오지 못했어요.</h1>
        <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 로그인 상태를 확인해 주세요.</p>
        <button type="button" onClick={reset}>
          다시 시도하기
        </button>
      </section>
    </main>
  );
}
