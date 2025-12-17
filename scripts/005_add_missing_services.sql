-- Add missing services referenced in the frontend

INSERT INTO public.services (name, description, price, features, delivery_time, is_active) VALUES
('Website + WhatsApp Chatbot', 'Complete digital solution with website and WhatsApp chatbot integration', 9999.00,
 ARRAY['Website + WhatsApp Chatbot', 'Full integration between systems', 'Client dashboard for tracking', 'Lead management system', 'Payment tracking', 'Automated workflows', 'Real-time notifications', 'Priority support'],
 '48 hours', true),

('Premium Growth Bundle', 'Complete growth solution for cafes, gyms & salons', 14999.00,
 ARRAY['Website + WhatsApp bot', 'Google My Business optimization', 'Free 1-month social media automation', '10 Canva-made posts included', 'Local SEO optimization', 'Review management system', 'Social media scheduling', 'Growth analytics dashboard'],
 '3-5 days', true),

('WhatsApp Chatbot Only', 'AI-powered WhatsApp bot with smart automation', 3999.00,
 ARRAY['AI-powered WhatsApp bot', 'Interactive menus (Plans, FAQs, Contact)', 'Payment link integration', 'Auto-reminders & notifications', 'Lead capture system', '24/7 automated responses', 'Custom greeting messages', 'Analytics dashboard'],
 '48 hours', true);