-- Upload 5 tailored testimonials for SES ICT HUB
-- Safe to run on existing DBs with testimonial schema variations.

ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

INSERT INTO public.testimonials (name, persona, rating, quote, approved)
VALUES
(
  'Brian Omondi',
  'student',
  5,
  'Found a perfect Grade A refurbished HP EliteBook for my campus projects. The 8GB RAM/256GB SSD specs were exactly as listed, and it was delivered to my hostel in Nairobi in under 2 hours!',
  true
),
(
  'Sarah Wambui',
  'business',
  5,
  'I needed a high-performance desktop for my new office at Bihi Towers. SES ICT HUB provided a clean Dell workstation with a 12-month warranty. Professional service and very reliable.',
  true
),
(
  'Kevin Mutua',
  'cyber_owner',
  5,
  'Equipped my entire cyber cafe with refurbished monitors and printers from SES. Their Grade B stock is excellent value, and being able to pay via M-PESA on delivery made the process risk-free.',
  true
),
(
  'Anita Njeri',
  'student',
  5,
  'I was skeptical about refurbished laptops until I visited their shop at Tembo Cooperative House. The team is transparent about grading, and my Grade A MacBook feels brand new!',
  true
),
(
  'David Kiprop',
  'business',
  5,
  'The best electronics hub on Moi Avenue. Fast delivery, genuine products, and very helpful after-sales support for our office printer setup. 100% recommended for Nairobi businesses.',
  true
);
