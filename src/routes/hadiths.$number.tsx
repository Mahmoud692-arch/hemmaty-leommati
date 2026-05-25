import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hadiths/$number")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/hadiths/$collection/$number",
      params: {
        collection: "nawawi",
        number: params.number,
      },
    });
  },
  loader: () => {},
  component: () => null,
});
