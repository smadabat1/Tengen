/**
 * Inline SVG brand icons for supported password managers.
 * Paths sourced from Simple Icons (simpleicons.org) — MIT licensed.
 */

function BrandIcon({ path, color, size = 18, title }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <path d={path} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Individual brand icons
// ---------------------------------------------------------------------------

export function BitwardenIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#175DDC"
      title="Bitwarden"
      path="M3.887 0C1.745 0 0 1.745 0 3.887v8.226c0 5.02 3.61 8.532 8.128 11.78l.121.086.121-.086C12.89 20.645 16.5 17.133 16.5 12.113V3.887C16.5 1.745 14.755 0 12.613 0zm4.24 13.154-3.072-3.096.888-.888 2.184 2.208 4.56-4.632.888.888z"
    />
  )
}

export function ChromeIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#4285F4"
      title="Google Chrome"
      path="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 8.727a3.273 3.273 0 1 1 0 6.546 3.273 3.273 0 0 1 0-6.546z"
    />
  )
}

export function FirefoxIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#FF7139"
      title="Firefox"
      path="M21.805 10.38c-.274-1.068-1.03-2.25-1.573-2.62.44.864.694 1.76.784 2.52-1.8-4.49-5.084-6.3-7.73-10.25-.135-.21-.268-.416-.4-.635a6.78 6.78 0 0 1-.257-.52 4.39 4.39 0 0 1-.37-1.333.06.06 0 0 0-.053-.046.065.065 0 0 0-.04.01C7.95.83 6.862 4.025 6.8 7.31c-1.35.1-2.63.61-3.67 1.465a4.2 4.2 0 0 0-.36-.276 6.6 6.6 0 0 1-.038-3.606C1.27 5.923.42 7.34.13 8.772c-.2.963-.13 1.965.01 2.617C.14 19.48 6.42 24 12.02 24c5.95 0 12-4.52 12-12 0-.546-.08-1.076-.215-1.62z"
    />
  )
}

export function EdgeIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#0078D4"
      title="Microsoft Edge"
      path="M21.086 14.465c-.277.124-.563.226-.856.305a9.93 9.93 0 0 1-2.594.343 4.92 4.92 0 0 1-2.9-.785c-.766-.52-1.17-1.333-1.17-2.3 0-.8.38-1.558 1.043-2.082a4.57 4.57 0 0 1 2.93-.892c.453 0 .894.068 1.31.19C18.98 5.915 16.014 3.5 12.492 3.5 7.526 3.5 3.5 7.527 3.5 12.492S7.527 21.5 12.492 21.5c5.437 0 9.508-3.957 9.508-9 0-.002 0-.023-.002-.024a8.8 8.8 0 0 0-.912 1.99"
    />
  )
}

export function LastPassIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#D32D27"
      title="LastPass"
      path="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm3.5 10.5H8.5v-1.5h3V10h2v3.5h1.5V15z"
    />
  )
}

export function OnePasswordIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#0094F5"
      title="1Password"
      path="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.5 6h2l-1.375 6.125H13.5l.5 2h-4l.5-2h1.375zm.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
    />
  )
}

export function DashlaneIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#003B57"
      title="Dashlane"
      path="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 7h2v5.586l3.707 3.707-1.414 1.414L11 13.414V7z"
    />
  )
}

export function KeePassIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#6CAC4D"
      title="KeePass"
      path="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4a8 8 0 1 1 0 16A8 8 0 0 1 12 4zm0 3a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
    />
  )
}

export function GenericCsvIcon({ size }) {
  return (
    <BrandIcon
      size={size}
      color="#6B7280"
      title="Generic CSV"
      path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 4h7l5 5v11H6V4zm2 8h8v1H8zm0 3h8v1H8zm0 3h5v1H8z"
    />
  )
}
