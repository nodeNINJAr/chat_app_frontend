import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
        }}
      >
        <div
          style={{
            width: 108,
            height: 86,
            background: "#fafafa",
            borderRadius: "34px 34px 34px 6px",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
