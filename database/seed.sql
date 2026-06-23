INSERT INTO categories (id, name) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Technology'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Business'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Design'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Marketing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tags (id, name) VALUES 
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'React'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Nodejs'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Postgres'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Express')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, roles, is_suspended) VALUES 
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'admin@example.com', '$2b$10$JpAJUy73r5BMgGpSMH4/ZeSEiLLNkDH9/sX1YORvstndAx/Mc0B5q', 'Admin User', '{admin,organizer,attendee}', false),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'organizer@example.com', '$2b$10$JpAJUy73r5BMgGpSMH4/ZeSEiLLNkDH9/sX1YORvstndAx/Mc0B5q', 'Organizer User', '{organizer,attendee}', false),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'attendee@example.com', '$2b$10$JpAJUy73r5BMgGpSMH4/ZeSEiLLNkDH9/sX1YORvstndAx/Mc0B5q', 'Attendee User', '{attendee}', false)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, roles = EXCLUDED.roles, is_suspended = EXCLUDED.is_suspended;

INSERT INTO events (id, title, description, category_id, start_date, end_date, type, location, status, capacity, banner_url, organizer_id) VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'Fullstack JavaScript Workshop', 'A comprehensive hands-on workshop covering React, Node.js, and Postgres.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-07-10T10:00:00Z', '2026-07-10T17:00:00Z', 'in-person', '123 Tech Avenue, Silicon Valley', 'published', 2, NULL, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tags (event_id, tag_id) VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23')
ON CONFLICT (event_id, tag_id) DO NOTHING;
