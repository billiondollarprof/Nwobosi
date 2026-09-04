/* ==========================================================================
   INTEGRATION GLYPHS
   The marks for the systems a deployment connects to.

   They live here rather than in icons.jsx because that file is the
   product's own identity, and these are other people's. Mixing them makes
   both harder to find.

   Every one is inline SVG on a 24 grid, drawn in the owner's colours so it
   reads as itself in either theme. They are recognisable rather than
   pixel exact: at 20px in a moving strip, the silhouette and the colour
   are the whole signal, and a faithful trace of fine detail is paint
   nobody can see.
   ========================================================================== */

export function TeamsGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Microsoft Teams">
      <circle cx="17.5" cy="6" r="2.6" fill="#5059C9" />
      <circle cx="10" cy="5.5" r="3.2" fill="#7B83EB" />
      <rect x="13.5" y="9.5" width="8.5" height="8.5" rx="1.6" fill="#5059C9" />
      <rect x="2.5" y="8.5" width="11.5" height="11" rx="2" fill="#7B83EB" />
      <path d="M5 11.4h6.4v1.5H9.6v5.2H7.9v-5.2H5z" fill="#FFFFFF" />
    </svg>
  );
}

export function OneDriveGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Microsoft OneDrive">
      <path
        d="M7.6 9.1a4.6 4.6 0 0 1 8.5-1.4 3.7 3.7 0 0 1 5 3.4 3.5 3.5 0 0 1-3.4 3.5H7.2A3.9 3.9 0 0 1 7.6 9.1z"
        fill="#0364B8"
      />
      <path
        d="M6.6 16.6h11.2a3.4 3.4 0 0 0 3.3-2.6H6.9a3.1 3.1 0 0 0-.3 2.6z"
        fill="#0F78D4"
      />
      <circle cx="5.4" cy="12.6" r="3.4" fill="#28A8EA" />
    </svg>
  );
}

export function SharePointGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Microsoft SharePoint">
      <circle cx="10" cy="7.5" r="5.2" fill="#036C70" />
      <circle cx="16.4" cy="12.4" r="4.6" fill="#1A9BA1" />
      <circle cx="11.4" cy="17.6" r="3.6" fill="#37C6D0" />
      <rect x="3" y="8.6" width="9.4" height="9.4" rx="1.4" fill="#03787C" />
      <path d="M5.4 11h4.8v1.3H8.7v4.2H7.2v-4.2H5.4z" fill="#FFFFFF" />
    </svg>
  );
}

export function OutlookGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Microsoft Outlook">
      <rect x="10" y="5.5" width="11.5" height="13" rx="1.2" fill="#0F6CBD" />
      <path d="M10 8.6l5.8 3.7 5.7-3.7v1.8l-5.7 3.8-5.8-3.8z" fill="#FFFFFF" opacity="0.85" />
      <rect x="2" y="4" width="10.5" height="16" rx="2" fill="#0358A7" />
      <path
        d="M7.2 7.6c-1.9 0-3.1 1.7-3.1 4.4s1.2 4.4 3.1 4.4 3.1-1.7 3.1-4.4-1.2-4.4-3.1-4.4zm0 1.9c.8 0 1.3.9 1.3 2.5S8 14.5 7.2 14.5s-1.3-.9-1.3-2.5.5-2.5 1.3-2.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function DropboxGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Dropbox">
      <path
        d="M6.6 3.4L1.5 6.8l5.1 3.4 5.4-3.4zM17.4 3.4l-5.4 3.4 5.4 3.4 5.1-3.4zM1.5 13.6l5.1 3.4 5.4-3.4-5.4-3.4zM17.4 10.2L12 13.6l5.4 3.4 5.1-3.4zM6.7 18.1l5.3 3.3 5.3-3.3-5.3-3.3z"
        fill="#0061FF"
      />
    </svg>
  );
}

export function ZoomGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Zoom">
      <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#0B5CFF" />
      <path
        d="M6 9.4c0-.5.4-.9.9-.9h5.2c.9 0 1.6.7 1.6 1.6v4.5c0 .5-.4.9-.9.9H7.6c-.9 0-1.6-.7-1.6-1.6zM15 11.2l3-1.9c.4-.3.9 0 .9.5v4.4c0 .5-.5.8-.9.5l-3-1.9z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function SalesforceGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Salesforce">
      <path
        d="M10 6.4a3.6 3.6 0 0 1 5.8-.8 4.4 4.4 0 0 1 6 4.1 4.3 4.3 0 0 1-4.3 4.3c-.3 0-.6 0-.9-.1a3.2 3.2 0 0 1-4.2 1.3 3.6 3.6 0 0 1-6.7-.7 3.9 3.9 0 0 1-.9.1A3.6 3.6 0 0 1 2 11a3.6 3.6 0 0 1 2.4-3.4A4 4 0 0 1 10 6.4z"
        fill="#00A1E0"
      />
    </svg>
  );
}

export function HubSpotGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="HubSpot">
      <path
        d="M16.6 9.1V6.8a1.9 1.9 0 1 0-1.9-1.9v.2l-5.2 3a4.7 4.7 0 0 0-1.4-.5V3.1H6.2v4.5a4.7 4.7 0 1 0 3.2 8.6l1.7 1.7a2.6 2.6 0 1 0 1.3-1.3l-1.6-1.6a4.7 4.7 0 0 0 .6-2.3 4.7 4.7 0 0 0-.3-1.7l5.1-2.9a4.6 4.6 0 0 0 .4.1zM8.8 15.2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
        fill="#FF7A59"
      />
    </svg>
  );
}

export function ConfluenceGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Confluence">
      <path
        d="M2.4 16.9c1.9-3.1 4.1-4.6 6.6-4.4 2 .2 3.4 1.4 5.3 3.4l3.1 3.2c.4.4 1.1.4 1.5-.1l2.6-3.1c.3-.4.3-1 0-1.4-1-1-2.6-2.5-3.4-3.2-2.7-2.3-4.7-3-7.2-2.6-3 .5-5.4 2.6-7.3 5.6-.3.4-.2 1 .2 1.3z"
        fill="#2684FF"
      />
      <path
        d="M21.6 7.1c-1.9 3.1-4.1 4.6-6.6 4.4-2-.2-3.4-1.4-5.3-3.4L6.6 4.9c-.4-.4-1.1-.4-1.5.1L2.5 8.1c-.3.4-.3 1 0 1.4 1 1 2.6 2.5 3.4 3.2 2.7 2.3 4.7 3 7.2 2.6 3-.5 5.4-2.6 7.3-5.6.3-.4.2-1-.2-1.3z"
        fill="#0052CC"
      />
    </svg>
  );
}

export function WhatsAppGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="WhatsApp">
      <path
        d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.2 21.8l5.2-1.4A9.7 9.7 0 1 0 12 2.2z"
        fill="#25D366"
      />
      <path
        d="M9.2 7.3c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.8 4.3 3.8 2.1.8 2.6.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3-1.5-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.5.3-.5v-.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
