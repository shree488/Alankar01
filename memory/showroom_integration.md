# Verified showroom map and hero assets (July 2026)

## Source supplied by client
https://share.google/ssEBGfxWdCO83eUnt
Redirects to Google Search knowledge graph /g/11yl7rvjm_ and query New Alankar Jewellers, Tasgaon.

## Business verified in Google Maps browser
- Name: New Alankar Jewellers, Tasgaon
- Address: Kasar Galli, Somwar Peth, Tasgaon, Maharashtra 416312, India
- Coordinates: 17.0373931, 74.6029575
- Google feature ID: 0x3bc13f890e61b56d:0x2f330e94ebcfb7e
- CID: 212567386023066494 (decimal of the verified feature ID)
- Google listing currently marked Temporarily closed. No hours/phone provided by Google. Site uses original client-supplied phone +91 9890271037 and recommends calling before visiting. Do not claim the store is open or change the Google listing.

## Google-generated iframe URL, verified HTTP 200
Requested legacy https://maps.google.com/maps?cid=212567386023066494&output=embed&hl=mr
Google redirected to:
https://www.google.com/maps/embed?origin=mfe&pb=!1m3!3m2!1m1!4s212567386023066494!3m1!1smr!5m1!1smr
Response includes the exact business name, address, coordinates and CID. No X-Frame-Options restriction. This is a public Google map embed, NOT the key-required Maps JavaScript API or maps/embed/v1. No API key required for this public iframe.
Official Maps URL directions uses api=1 and exact destination coordinates. Original share link retained as a second external action.

## Integration approach
Auth/storage irrelevant to this change. Consulted Google Maps integration playbook, which provided JavaScript API reference requiring keys but unnecessary for a public map iframe. Verified Google-generated embed via actual Google redirect and current embed documentation. No third-party SDK installed; native iframe with lazy loading, accessible Marathi title, allowFullScreen and referrerPolicy=no-referrer-when-downgrade. URLs are configured in frontend/.env.

## Hero photograph
Curated stock portrait previously selected for this project, explicitly chosen again by client for traditional woman background:
https://images.unsplash.com/photo-1756483560049-e7b2208f99a0?auto=format&fit=crop&w=1800&q=85
Inspected image: adult woman wearing traditional pink embroidered sari and elaborate gold-coloured bridal jewellery, framed face and necklace. Used as decorative hero imagery only, NOT merchandise or a business representative/testimonial.
Downloaded and optimized to local WebP: public/traditional-portrait.webp (1200x1799, ~293KB) and traditional-portrait-mobile.webp (640x960, ~104KB). Original JPEG removed. No external stock dependency at runtime.

## Incorrect design-agent suggestions explicitly discarded
Design blueprint contained invented Pune coordinates (18.52,73.85), generic main-road address and malformed phone. These were NOT implemented; replaced in design guidelines with the verified Tasgaon data above.
