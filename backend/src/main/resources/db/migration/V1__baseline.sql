-- Schema of the application when Flyway was introduced. Existing databases skip this file (baseline).

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    is_read boolean,
    message character varying(255) NOT NULL,
    property_id bigint NOT NULL,
    reservation_id bigint,
    title character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    user_id bigint NOT NULL
);

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

CREATE TABLE public.properties (
    id bigint NOT NULL,
    address character varying(255),
    air_condition boolean,
    appartient_residence boolean,
    bathrooms integer,
    configuration character varying(255),
    created_at timestamp(6) without time zone,
    created_by bigint,
    description character varying(255),
    distance_beach double precision,
    garage boolean,
    haut_standing boolean,
    kitchen boolean,
    max_capacity integer,
    owner_contact character varying(255),
    photos character varying(255),
    pool boolean,
    price_per_day double precision,
    price_per_month double precision,
    price_per_week double precision,
    sea_view boolean,
    terrace boolean,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    wifi boolean
);

CREATE SEQUENCE public.properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;

CREATE TABLE public.property_availability (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    date character varying(255) NOT NULL,
    notes character varying(255),
    property_id bigint NOT NULL,
    status character varying(255) NOT NULL
);

CREATE SEQUENCE public.property_availability_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.property_availability_id_seq OWNED BY public.property_availability.id;

CREATE TABLE public.property_images (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    image_path character varying(255) NOT NULL,
    is_main boolean,
    "position" integer,
    property_id bigint NOT NULL,
    content_type character varying(50),
    size_bytes bigint
);

CREATE SEQUENCE public.property_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.property_images_id_seq OWNED BY public.property_images.id;

CREATE TABLE public.property_links (
    id bigint NOT NULL,
    property_id bigint NOT NULL,
    url character varying(1000) NOT NULL
);

CREATE SEQUENCE public.property_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.property_links_id_seq OWNED BY public.property_links.id;

CREATE TABLE public.property_samsars (
    property_id bigint NOT NULL,
    samsar_id bigint NOT NULL,
    price_increase_tnd integer,
    commission_percent integer
);

CREATE TABLE public.property_seasonal_prices (
    id bigint NOT NULL,
    end_date character varying(255) NOT NULL,
    price_per_day double precision NOT NULL,
    property_id bigint NOT NULL,
    start_date character varying(255) NOT NULL
);

CREATE SEQUENCE public.property_seasonal_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.property_seasonal_prices_id_seq OWNED BY public.property_seasonal_prices.id;

CREATE TABLE public.reservations (
    id bigint NOT NULL,
    advance_amount double precision,
    check_in_time character varying(255),
    check_out_time character varying(255),
    client_name character varying(255) NOT NULL,
    client_phone character varying(255),
    created_at timestamp(6) without time zone,
    end_date character varying(255) NOT NULL,
    notes character varying(255),
    property_id bigint NOT NULL,
    samsar_id bigint NOT NULL,
    start_date character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    total_amount double precision NOT NULL,
    updated_at timestamp(6) without time zone,
    samsar_commission_percent integer,
    samsar_gain double precision,
    samsar_margin_tnd integer,
    base_amount double precision,
    negotiated_price_per_day double precision,
    original_end_date character varying(255),
    refund_amount double precision,
    samsar_refund_amount double precision
);

CREATE SEQUENCE public.reservations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;

CREATE TABLE public.revenue_history (
    id bigint NOT NULL,
    amount double precision NOT NULL,
    created_at timestamp(6) without time zone,
    reservation_id bigint NOT NULL,
    type character varying(255) NOT NULL,
    user_id bigint NOT NULL
);

CREATE SEQUENCE public.revenue_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.revenue_history_id_seq OWNED BY public.revenue_history.id;

CREATE TABLE public.users (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    phone character varying(255),
    photo_url character varying(255),
    role character varying(255),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['PROPRIETAIRE'::character varying, 'SAMSAR'::character varying])::text[])))
);

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);

ALTER TABLE ONLY public.property_availability ALTER COLUMN id SET DEFAULT nextval('public.property_availability_id_seq'::regclass);

ALTER TABLE ONLY public.property_images ALTER COLUMN id SET DEFAULT nextval('public.property_images_id_seq'::regclass);

ALTER TABLE ONLY public.property_links ALTER COLUMN id SET DEFAULT nextval('public.property_links_id_seq'::regclass);

ALTER TABLE ONLY public.property_seasonal_prices ALTER COLUMN id SET DEFAULT nextval('public.property_seasonal_prices_id_seq'::regclass);

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);

ALTER TABLE ONLY public.revenue_history ALTER COLUMN id SET DEFAULT nextval('public.revenue_history_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.property_availability
    ADD CONSTRAINT property_availability_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.property_links
    ADD CONSTRAINT property_links_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.property_samsars
    ADD CONSTRAINT property_samsars_pkey PRIMARY KEY (property_id, samsar_id);

ALTER TABLE ONLY public.property_seasonal_prices
    ADD CONSTRAINT property_seasonal_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.revenue_history
    ADD CONSTRAINT revenue_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);

ALTER TABLE ONLY public.property_availability
    ADD CONSTRAINT ukk6q5y7mft3rqlvsmpdmsv00b5 UNIQUE (property_id, date);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.revenue_history
    ADD CONSTRAINT fk1655hag1nwulw2eiti78rxk40 FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT fk4jtk0v65150brl2rbepalhni4 FOREIGN KEY (samsar_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.property_samsars
    ADD CONSTRAINT fk8ixsakr8tn6odduaju68huu13 FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.property_seasonal_prices
    ADD CONSTRAINT fk9w79e6b52l84vf8grloc1dymj FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk9y21adhxn0ayjhfocscqox7bh FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.property_availability
    ADD CONSTRAINT fka6ovqlbyuvnnp50qsfrs8d22n FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fkca871csl3jsrvy1cuxyv0jn2 FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT fkci2fet5mvd39l06hnwdni7j73 FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT fkemw5i1cysiorfaxfba7tgtpiu FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fkeua0pytgljr86idnpkhuir1mu FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);

ALTER TABLE ONLY public.revenue_history
    ADD CONSTRAINT fkjsonen6q7rdk0und1dwlsptib FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.property_links
    ADD CONSTRAINT fkjvqkkflasnyuam4ld21rw42qb FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.property_samsars
    ADD CONSTRAINT fkloypkpw2w2tpbvt830h2vpqdg FOREIGN KEY (samsar_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT fko0x0js5gs43o4bj3aeq6ba62l FOREIGN KEY (property_id) REFERENCES public.properties(id);
