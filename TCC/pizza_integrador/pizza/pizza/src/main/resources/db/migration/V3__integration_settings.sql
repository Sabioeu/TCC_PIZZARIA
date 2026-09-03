alter table business_settings add column whatsapp_connected boolean default false not null;
alter table business_settings add column whatsapp_mode varchar(40);
alter table business_settings add column whatsapp_phone_number varchar(80);
alter table business_settings add column payment_provider varchar(80);
alter table business_settings add column fiscal_provider varchar(80);
alter table business_settings add column fiscal_environment varchar(40);
