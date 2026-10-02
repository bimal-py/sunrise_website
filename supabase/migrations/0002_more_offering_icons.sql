-- More icons for services and prints (the dashboard's icon picker). Keep in step with
-- OFFERING_ICONS in shared/domain/offering.ts.
begin;

alter table public.services drop constraint if exists services_icon_check;
alter table public.prints drop constraint if exists prints_icon_check;

alter table public.services add constraint services_icon_check check (icon in ('Heart', 'Clapperboard', 'Flower2', 'Flame', 'Users', 'IdCard', 'PartyPopper', 'BookHeart', 'Frame', 'Image', 'Printer', 'BookImage', 'Camera', 'Aperture', 'Film', 'Video', 'Baby', 'Gift', 'Music', 'Drum', 'Cake', 'Gem', 'Crown', 'HandHeart', 'Images', 'Album', 'Landmark', 'GraduationCap', 'Mountain', 'Sunrise', 'ScanFace', 'Smile'));
alter table public.prints add constraint prints_icon_check check (icon in ('Heart', 'Clapperboard', 'Flower2', 'Flame', 'Users', 'IdCard', 'PartyPopper', 'BookHeart', 'Frame', 'Image', 'Printer', 'BookImage', 'Camera', 'Aperture', 'Film', 'Video', 'Baby', 'Gift', 'Music', 'Drum', 'Cake', 'Gem', 'Crown', 'HandHeart', 'Images', 'Album', 'Landmark', 'GraduationCap', 'Mountain', 'Sunrise', 'ScanFace', 'Smile'));

commit;
