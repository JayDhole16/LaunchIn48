-- Seed initial data for LaunchIn 48

-- Insert services
INSERT INTO public.services (name, description, price, features, delivery_time, is_active) VALUES
('Basic Website', 'Professional business website with modern design', 15000.00, 
 ARRAY['Responsive Design', '5 Pages', 'Contact Form', 'SEO Optimized', 'Mobile Friendly'], 
 '48 hours', true),

('E-commerce Website', 'Full-featured online store with payment integration', 35000.00,
 ARRAY['Product Catalog', 'Shopping Cart', 'Payment Gateway', 'Admin Panel', 'Order Management', 'Inventory System'],
 '5-7 days', true),

('Custom Web Application', 'Tailored web application for your business needs', 50000.00,
 ARRAY['Custom Features', 'Database Integration', 'User Authentication', 'Admin Dashboard', 'API Integration'],
 '7-10 days', true),

('Chatbot Development', 'AI-powered chatbot for customer support', 20000.00,
 ARRAY['Natural Language Processing', 'Multi-platform Support', 'Analytics Dashboard', 'Custom Training'],
 '3-5 days', true),

('Website Maintenance', 'Monthly website maintenance and updates', 5000.00,
 ARRAY['Security Updates', 'Content Updates', 'Performance Optimization', 'Backup Management'],
 'Ongoing', true);

-- Insert portfolio items
INSERT INTO public.portfolio_items (title, description, image_url, project_url, technologies, category, is_featured) VALUES
('TechCorp Business Website', 'Modern corporate website with advanced features', '/placeholder.svg?height=400&width=600', 'https://techcorp-demo.com',
 ARRAY['Next.js', 'Tailwind CSS', 'TypeScript'], 'Business Website', true),

('ShopEasy E-commerce', 'Full-featured online store with payment integration', '/placeholder.svg?height=400&width=600', 'https://shopeasy-demo.com',
 ARRAY['React', 'Node.js', 'MongoDB', 'Stripe'], 'E-commerce', true),

('HealthCare Management System', 'Custom web application for healthcare providers', '/placeholder.svg?height=400&width=600', 'https://healthcare-demo.com',
 ARRAY['Vue.js', 'Express.js', 'PostgreSQL'], 'Web Application', true),

('AI Customer Support Bot', 'Intelligent chatbot for customer service', '/placeholder.svg?height=400&width=600', 'https://chatbot-demo.com',
 ARRAY['Python', 'TensorFlow', 'React', 'WebSocket'], 'Chatbot', false);

-- Insert testimonials
INSERT INTO public.testimonials (client_name, client_company, testimonial, rating, is_featured) VALUES
('Rajesh Kumar', 'TechSolutions Pvt Ltd', 'LaunchIn 48 delivered our website exactly as promised - in just 48 hours! The quality exceeded our expectations and the team was incredibly professional.', 5, true),

('Priya Sharma', 'Fashion Forward', 'Amazing work on our e-commerce platform. The design is beautiful and the functionality is perfect. Our sales have increased by 40% since launch!', 5, true),

('Amit Patel', 'StartupHub', 'The custom web application they built for us has streamlined our entire business process. Highly recommend LaunchIn 48 for any web development needs.', 5, false),

('Sneha Reddy', 'Digital Marketing Pro', 'Their chatbot solution has revolutionized our customer support. We now handle 3x more queries with better satisfaction rates.', 4, true);

-- Create admin user (this will be handled by the signup trigger)
-- The admin role will need to be updated manually after user creation
