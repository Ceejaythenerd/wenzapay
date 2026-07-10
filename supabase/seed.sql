-- Seed data for testing
insert into merchants (id, email, business_name, category, status)
values ('00000000-0000-0000-0000-000000000001', 'test@wenzapay.io', 'Test Merchant', 'other', 'active')
on conflict do nothing;

insert into api_keys (merchant_id, key_hash, prefix, name)
values ('00000000-0000-0000-0000-000000000001', 'test_hash', 'wpay_test_', 'Test Key')
on conflict do nothing;
