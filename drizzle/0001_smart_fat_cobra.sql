CREATE TABLE `mileage_rates` (
	`tax_year` integer PRIMARY KEY NOT NULL,
	`rate_micro_per_mile` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
