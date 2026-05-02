-- ============================================================================
-- SEED DATA: Sample competitions for development
-- ============================================================================

INSERT INTO competitions (name, organizer_name, category, grade_level, fee, quota, reg_open_date, reg_close_date, competition_date, description, image_url)
VALUES
  ('Olimpiade Matematika Nasional 2026', 'Kementerian Pendidikan', 'Matematika', 'SMA', 150000, 500, '2026-03-01', '2026-05-01', '2026-06-15', 'Kompetisi matematika tingkat nasional untuk siswa SMA se-Indonesia. Babak penyisihan dilakukan secara online.', NULL),
  ('Science Fair Indonesia', 'Indonesian Science Society', 'Sains', 'SMP,SMA', 200000, 300, '2026-04-01', '2026-06-01', '2026-07-20', 'Pameran sains dan inovasi untuk pelajar SMP dan SMA. Peserta mempresentasikan proyek penelitian.', NULL),
  ('Lomba Debat Ekonomi', 'FEB Universitas Indonesia', 'Ekonomi', 'SMA', 100000, 200, '2026-03-15', '2026-04-30', '2026-05-25', 'Kompetisi debat ekonomi antar sekolah tingkat nasional.', NULL),
  ('English Speech Contest', 'British Council Indonesia', 'Bahasa', 'SMP,SMA', 75000, 400, '2026-04-10', '2026-05-20', '2026-06-10', 'Lomba pidato bahasa Inggris terbuka untuk siswa SMP dan SMA.', NULL),
  ('Robotics Challenge 2026', 'Indonesia Robotics Association', 'Teknologi', 'SD,SMP,SMA', 250000, 150, '2026-05-01', '2026-07-01', '2026-08-15', 'Kompetisi robotika terbuka untuk semua jenjang. Tim terdiri dari 3-5 orang.', NULL),
  ('Lomba Seni Lukis Nusantara', 'Kementerian Kebudayaan', 'Seni', 'SD,SMP', 50000, 600, '2026-03-20', '2026-05-15', '2026-06-05', 'Lomba melukis dengan tema kearifan lokal Nusantara.', NULL)
ON CONFLICT DO NOTHING;
