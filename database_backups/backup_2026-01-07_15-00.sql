--
-- PostgreSQL database dump
--

\restrict wOivFZQ2iNlKICYxcWgr35qolPzgA3Teh9CFoAObMQfvfUcpE6Rn2yA366DIlrr

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: document_type; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.document_type AS ENUM (
    '계약서',
    '사업자등록증',
    '신분증',
    '기타'
);


ALTER TYPE public.document_type OWNER TO bomeewoo;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.payment_method AS ENUM (
    '계좌이체',
    '카드',
    '현금',
    '자동이체',
    '기타'
);


ALTER TYPE public.payment_method OWNER TO bomeewoo;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.payment_status AS ENUM (
    '대기',
    '완료',
    '연체',
    '취소'
);


ALTER TYPE public.payment_status OWNER TO bomeewoo;

--
-- Name: room_status; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.room_status AS ENUM (
    '입주',
    '공실',
    '예약',
    '정비중',
    '계약종료'
);


ALTER TYPE public.room_status OWNER TO bomeewoo;

--
-- Name: room_type; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.room_type AS ENUM (
    '1인실',
    '2인실',
    '6인실',
    '회의실',
    '자유석',
    'POST BOX'
);


ALTER TYPE public.room_type OWNER TO bomeewoo;

--
-- Name: tenant_type; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.tenant_type AS ENUM (
    '상주',
    '비상주'
);


ALTER TYPE public.tenant_type OWNER TO bomeewoo;

--
-- Name: transaction_category; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.transaction_category AS ENUM (
    '임대료',
    '관리비',
    '보증금',
    '기타수입',
    '유지보수',
    '공과금',
    '인건비',
    '기타지출',
    '위약금',
    '비상주사용료',
    '회의실사용료',
    '1day사용료',
    '월사용료',
    '보증금입금',
    '사용료전환',
    '마케팅',
    '청소미화',
    '소모품'
);


ALTER TYPE public.transaction_category OWNER TO bomeewoo;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: bomeewoo
--

CREATE TYPE public.transaction_type AS ENUM (
    '입금',
    '지출'
);


ALTER TYPE public.transaction_type OWNER TO bomeewoo;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    room_id integer NOT NULL,
    tenant_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    monthly_rent integer NOT NULL,
    deposit integer DEFAULT 0 NOT NULL,
    management_fee integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    monthly_rent_vat integer DEFAULT 0 NOT NULL,
    card_x integer,
    card_y integer,
    card_width integer DEFAULT 200,
    card_height integer DEFAULT 120,
    rent_free_start date,
    rent_free_end date,
    termination_type character varying(20),
    penalty_amount integer DEFAULT 0,
    deposit_status character varying(20) DEFAULT '보유'::character varying,
    termination_reason text,
    terminated_at timestamp without time zone,
    payment_day integer DEFAULT 10
);


ALTER TABLE public.contracts OWNER TO bomeewoo;

--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contracts_id_seq OWNER TO bomeewoo;

--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    tenant_id integer,
    contract_id integer,
    document_type public.document_type NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents OWNER TO bomeewoo;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO bomeewoo;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: monthly_billings; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.monthly_billings (
    id integer NOT NULL,
    year_month character varying(7) NOT NULL,
    contract_id integer,
    room_id integer,
    tenant_id integer,
    billing_type character varying(20) NOT NULL,
    amount integer NOT NULL,
    vat_amount integer DEFAULT 0,
    due_date date NOT NULL,
    status character varying(20) DEFAULT '대기'::character varying,
    payment_date date,
    transaction_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tax_invoice_issued boolean DEFAULT false,
    tax_invoice_date date,
    tax_invoice_number character varying(50)
);


ALTER TABLE public.monthly_billings OWNER TO bomeewoo;

--
-- Name: monthly_billings_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.monthly_billings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.monthly_billings_id_seq OWNER TO bomeewoo;

--
-- Name: monthly_billings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.monthly_billings_id_seq OWNED BY public.monthly_billings.id;


--
-- Name: monthly_settlements; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.monthly_settlements (
    id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    total_income integer DEFAULT 0 NOT NULL,
    total_expense integer DEFAULT 0 NOT NULL,
    net_profit integer DEFAULT 0 NOT NULL,
    occupancy_rate numeric(5,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.monthly_settlements OWNER TO bomeewoo;

--
-- Name: monthly_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.monthly_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.monthly_settlements_id_seq OWNER TO bomeewoo;

--
-- Name: monthly_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.monthly_settlements_id_seq OWNED BY public.monthly_settlements.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    room_number character varying(20) NOT NULL,
    room_type public.room_type NOT NULL,
    floor integer DEFAULT 3 NOT NULL,
    area_sqm numeric(10,2),
    base_price integer DEFAULT 0 NOT NULL,
    status public.room_status DEFAULT '공실'::public.room_status NOT NULL,
    position_x integer,
    position_y integer,
    width integer,
    height integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    card_x integer,
    card_y integer,
    card_width integer DEFAULT 180,
    card_height integer DEFAULT 100,
    last_company_name character varying(100),
    contract_ended_at timestamp without time zone
);


ALTER TABLE public.rooms OWNER TO bomeewoo;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_id_seq OWNER TO bomeewoo;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    company_name character varying(100) NOT NULL,
    representative_name character varying(50) NOT NULL,
    business_number character varying(20),
    email character varying(100),
    phone character varying(20),
    address text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tenant_type public.tenant_type DEFAULT '상주'::public.tenant_type NOT NULL
);


ALTER TABLE public.tenants OWNER TO bomeewoo;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tenants_id_seq OWNER TO bomeewoo;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: bomeewoo
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    contract_id integer,
    tenant_id integer,
    type public.transaction_type NOT NULL,
    category public.transaction_category NOT NULL,
    amount integer NOT NULL,
    transaction_date date NOT NULL,
    description text,
    payment_method character varying(50),
    receipt_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    room_id integer,
    billing_id integer,
    vat_amount integer DEFAULT 0,
    due_date date,
    status character varying(20) DEFAULT '완료'::character varying,
    receipt_file character varying(500),
    notes text,
    tax_invoice_issued boolean DEFAULT false,
    tax_invoice_date date,
    tax_invoice_number character varying(50)
);


ALTER TABLE public.transactions OWNER TO bomeewoo;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: bomeewoo
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transactions_id_seq OWNER TO bomeewoo;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bomeewoo
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: monthly_billings id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings ALTER COLUMN id SET DEFAULT nextval('public.monthly_billings_id_seq'::regclass);


--
-- Name: monthly_settlements id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_settlements ALTER COLUMN id SET DEFAULT nextval('public.monthly_settlements_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.contracts (id, room_id, tenant_id, start_date, end_date, monthly_rent, deposit, management_fee, is_active, notes, created_at, updated_at, monthly_rent_vat, card_x, card_y, card_width, card_height, rent_free_start, rent_free_end, termination_type, penalty_amount, deposit_status, termination_reason, terminated_at, payment_day) FROM stdin;
38	323	46	2025-11-21	2027-02-20	360000	0	0	t	\N	2025-12-26 20:57:37.234842	2025-12-31 16:57:34.622995	396000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
22	280	31	2025-12-01	2025-12-31	250000	0	0	t	\N	2025-12-26 17:39:35.970354	2025-12-26 22:00:27.212159	275000	\N	\N	200	120	2026-01-01	2026-01-13	\N	0	보유	\N	\N	1
21	281	30	2025-12-29	2026-12-28	331496	364650	0	t	\N	2025-12-26 17:37:44.19072	2025-12-26 22:00:37.849452	364646	\N	\N	200	120	2026-12-29	2027-03-27	\N	0	보유	\N	\N	29
34	319	42	2025-10-24	2026-04-23	180000	0	0	t	\N	2025-12-26 20:52:44.906416	2025-12-31 17:02:59.122224	198000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
29	299	37	2025-11-07	2026-11-06	297998	327800	0	t	\N	2025-12-26 18:41:58.725025	2025-12-26 22:01:19.217357	327798	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	7
35	320	43	2025-10-28	2026-01-27	90000	0	0	t	\N	2025-12-26 20:54:02.447473	2025-12-31 17:05:27.805569	99000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
26	291	35	2026-01-12	2026-02-28	290909	320000	0	t	\N	2025-12-26 18:33:15.762374	2025-12-26 22:03:04.830072	320000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	12
31	317	39	2025-09-15	2026-09-14	276350	0	0	t	\N	2025-12-26 18:55:39.552813	2025-12-31 17:09:50.189351	303985	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
20	282	29	2025-09-22	2026-03-21	371000	0	0	t	\N	2025-12-26 17:33:08.565072	2025-12-27 02:00:16.144946	408100	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	22
33	295	41	2025-11-04	2025-12-03	390000	0	0	f	\N	2025-12-26 20:12:05.316288	2025-12-27 08:15:06.969946	429000	\N	\N	200	120	2025-12-04	2025-12-17	만기종료	0	사용료전환	\N	2025-12-27 08:15:06.969946	10
25	277	34	2025-10-01	2025-10-31	342000	376200	0	f	\N	2025-12-26 18:28:51.814835	2025-12-26 20:43:36.373984	376200	\N	\N	200	120	\N	\N	중도종료	376200	위약금전환	사무실 올 시간이 없음	2025-12-26 20:43:36.373984	10
30	286	38	2025-10-15	2025-11-15	272727	300000	0	f	\N	2025-12-26 18:45:57.948031	2025-12-26 20:44:08.023632	300000	\N	\N	200	120	\N	\N	중도종료	300000	위약금전환	이사감	2025-12-26 20:44:08.023632	10
41	326	49	2026-01-01	2026-03-31	90000	0	0	t	\N	2025-12-29 15:40:26.034309	2025-12-31 17:14:09.191584	99000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
15	310	23	2025-09-15	2026-09-14	750000	0	0	t	\N	2025-12-26 16:04:00.431182	2025-12-29 20:52:59.459123	825000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	15
23	278	32	2025-11-03	2026-11-02	332000	365200	0	t	\N	2025-12-26 17:53:49.823495	2025-12-29 20:56:22.99912	365200	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	3
27	292	35	2025-12-01	2026-02-28	418182	460000	0	t	\N	2025-12-26 18:35:59.007981	2025-12-29 21:14:22.182595	460000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	1
19	283	28	2025-10-01	2027-09-30	372727	410000	0	t	\N	2025-12-26 17:28:26.777552	2025-12-29 21:19:36.390077	410000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	1
36	321	44	2025-11-04	2026-05-03	180000	0	0	t	\N	2025-12-26 20:55:27.672335	2025-12-29 21:22:15.564849	198000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
37	322	45	2025-11-12	2026-05-11	180000	0	0	t	\N	2025-12-26 20:56:26.56383	2025-12-29 21:24:01.040704	198000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
18	307	27	2025-10-20	2026-10-19	230000	253000	0	t	\N	2025-12-26 16:17:12.591368	2025-12-29 21:30:35.261386	253000	\N	\N	200	120	2025-10-20	\N	\N	0	보유	\N	\N	20
17	308	26	2025-12-22	2026-12-21	354545	390000	0	t	\N	2025-12-26 16:14:36.026227	2025-12-29 21:39:44.820729	390000	\N	\N	200	120	2026-12-22	2027-03-21	\N	0	보유	\N	\N	22
16	309	25	2025-10-14	2026-04-13	288000	316800	0	t	\N	2025-12-26 16:11:41.275699	2025-12-29 21:50:26.942945	316800	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	13
42	295	36	2025-11-04	2025-12-17	390000	0	0	f	\N	2026-01-02 19:54:39.152155	2026-01-02 19:57:38.151297	429000	\N	\N	200	120	\N	\N	만기종료	0	사용료전환	\N	2026-01-02 19:57:38.151297	4
32	318	40	2025-10-20	2026-04-19	180000	0	0	t	\N	2025-12-26 18:57:28.021007	2025-12-29 22:11:29.121821	198000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
40	325	48	2025-12-12	2026-03-11	90000	0	0	t	\N	2025-12-26 22:06:59.128485	2025-12-29 22:13:41.54938	99000	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	10
28	296	36	2026-01-01	2026-06-30	315000	346500	0	t	\N	2025-12-26 18:40:21.488195	2026-01-02 19:58:53.501399	346500	\N	\N	200	120	2025-12-18	2025-12-31	\N	0	보유	\N	\N	1
24	276	33	2025-12-18	2026-03-17	370500	407550	0	t	\N	2025-12-26 17:58:47.227013	2025-12-31 16:39:51.368233	407550	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	18
39	324	47	2025-12-01	2026-11-30	360000	0	0	t	\N	2025-12-26 20:59:06.607533	2025-12-31 16:50:05.898639	396000	\N	\N	200	120	2026-12-01	2027-02-28	\N	0	보유	\N	\N	10
43	294	50	2026-01-03	2027-01-02	331500	364648	0	t	\N	2026-01-02 22:21:23.277564	2026-01-02 22:21:23.277564	364650	\N	\N	200	120	\N	\N	\N	0	보유	\N	\N	3
44	286	51	2026-01-12	2026-07-11	227273	250000	0	t	\N	2026-01-07 15:23:43.652286	2026-01-07 15:23:43.652286	250000	\N	\N	200	120	2026-07-12	2026-08-11	\N	0	보유	\N	\N	12
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.documents (id, tenant_id, contract_id, document_type, file_name, original_name, file_path, file_size, mime_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: monthly_billings; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.monthly_billings (id, year_month, contract_id, room_id, tenant_id, billing_type, amount, vat_amount, due_date, status, payment_date, transaction_id, notes, created_at, updated_at, tax_invoice_issued, tax_invoice_date, tax_invoice_number) FROM stdin;
1	2025-12	24	276	33	월사용료	407550	37050	2025-12-09	완료	2025-12-18	11	\N	2025-12-26 21:57:06.135951	2025-12-26 22:28:56.37652	f	\N	\N
3	2025-12	18	307	27	월사용료	253000	23000	2025-12-19	완료	2025-12-20	13	\N	2025-12-26 22:31:19.323891	2025-12-26 22:31:43.886297	f	\N	\N
8	2025-12	22	280	31	월사용료	275000	25000	2025-11-30	완료	2025-12-01	18	\N	2025-12-26 22:33:42.81087	2025-12-26 22:33:47.821164	f	\N	\N
11	2025-12	27	292	35	월사용료	460000	41818	2025-11-30	완료	2025-12-01	20	\N	2025-12-27 00:08:28.53739	2025-12-27 00:08:47.38868	f	\N	\N
12	2025-12	29	299	37	월사용료	327798	29800	2025-12-06	완료	2025-12-07	21	\N	2025-12-27 00:14:08.839849	2025-12-27 00:14:30.989872	f	\N	\N
13	2025-09	15	310	23	월사용료	825000	75000	2025-09-14	완료	2025-09-13	25	\N	2025-12-27 00:48:21.113345	2025-12-27 00:48:35.863284	f	\N	\N
25	2025-11	19	283	28	월사용료	410000	37273	2025-10-31	완료	2025-11-05	37	\N	2025-12-27 01:08:46.978584	2025-12-27 01:09:05.358621	f	\N	\N
17	2025-10	19	283	28	월사용료	410000	37273	2025-09-30	완료	2025-10-18	29	10/18에 입금	2025-12-27 00:59:17.162771	2025-12-27 01:09:27.366665	f	\N	\N
14	2025-09	20	282	29	월사용료	408100	37100	2025-09-21	완료	2025-09-22	26	2025-12-21 사용료까지 선납	2025-12-27 00:48:45.879871	2025-12-27 00:55:46.264687	f	\N	\N
15	2025-10	20	282	29	월사용료	408100	37100	2025-10-21	완료	2025-09-22	27	2025-12-21 사용료까지 선납	2025-12-27 00:56:05.150508	2025-12-27 00:56:19.499458	f	\N	\N
16	2025-11	20	282	29	월사용료	408100	37100	2025-11-21	완료	2025-09-22	28	2025-12-21 사용료까지 선납	2025-12-27 00:56:27.361929	2025-12-27 00:56:46.145309	f	\N	\N
9	2025-12	20	282	29	월사용료	408100	37100	2025-12-21	완료	2025-09-22	19	2025-12-21 사용료까지 선납	2025-12-26 22:34:15.197546	2025-12-27 00:57:19.490236	f	\N	\N
18	2025-10	18	307	27	월사용료	253000	23000	2025-10-19	완료	2025-10-20	30	\N	2025-12-27 00:59:42.92628	2025-12-27 01:00:17.192842	f	\N	\N
19	2025-11	18	307	27	월사용료	253000	23000	2025-11-19	완료	2025-11-20	31	\N	2025-12-27 01:01:02.250739	2025-12-27 01:01:14.093468	f	\N	\N
20	2025-10	16	309	25	월사용료	316800	28800	2025-10-12	완료	2025-10-13	32	\N	2025-12-27 01:01:38.771776	2025-12-27 01:01:50.991944	f	\N	\N
21	2025-11	16	309	25	월사용료	316800	28800	2025-11-12	완료	2025-11-13	33	1/18 입금	2025-12-27 01:01:57.77933	2025-12-27 01:02:19.668449	f	\N	\N
5	2025-12	16	309	25	월사용료	316800	28800	2025-12-12	완료	2025-12-13	15	12/15 입금	2025-12-26 22:32:29.444808	2025-12-27 01:02:56.948863	f	\N	\N
22	2025-10	15	310	23	월사용료	825000	75000	2025-10-14	완료	2025-10-15	34	\N	2025-12-27 01:05:00.315084	2025-12-27 01:05:09.995815	f	\N	\N
23	2025-11	15	310	23	월사용료	825000	75000	2025-11-14	완료	2025-11-15	35	11/17 입금	2025-12-27 01:05:57.078729	2025-12-27 01:06:31.324725	f	\N	\N
4	2025-12	15	310	23	월사용료	825000	75000	2025-12-14	완료	2025-12-15	14	12/16 입금	2025-12-26 22:32:07.241814	2025-12-27 01:06:56.384875	f	\N	\N
24	2025-11	23	278	32	월사용료	365200	33200	2025-11-02	완료	2025-11-03	36	\N	2025-12-27 01:07:46.513368	2025-12-27 01:07:55.066678	f	\N	\N
26	2025-11	33	295	41	월사용료	429000	39000	2025-11-09	완료	2025-11-04	38	\N	2025-12-27 01:09:48.052268	2025-12-27 01:09:59.519215	f	\N	\N
27	2025-11	28	296	36	월사용료	385000	35000	2025-11-03	완료	2025-11-03	39	\N	2025-12-27 01:10:43.155528	2025-12-27 01:10:54.440384	f	\N	\N
28	2025-11	29	299	37	월사용료	327798	29800	2025-11-06	완료	2025-11-07	40	11월, 12월 분 카드결제함	2025-12-27 01:11:04.209521	2025-12-27 01:11:37.89301	f	\N	\N
10	2025-12	21	281	30	월사용료	364646	33150	2025-12-28	완료	2025-12-29	66	\N	2025-12-27 00:07:40.047243	2025-12-29 14:19:15.599744	t	2025-12-29	\N
2	2025-12	17	308	26	월사용료	390000	35455	2025-12-21	완료	2025-12-22	12	\N	2025-12-26 22:29:50.139706	2025-12-31 16:02:00.408257	t	2025-12-31	\N
6	2025-12	19	283	28	월사용료	410000	37273	2025-11-30	완료	2025-12-01	16	\N	2025-12-26 22:32:59.289581	2025-12-31 18:18:31.730587	t	2025-12-31	\N
7	2025-12	23	278	32	월사용료	365200	33200	2025-12-02	완료	2025-12-04	17	\N	2025-12-26 22:33:11.399779	2026-01-05 21:11:30.972574	t	2026-01-05	\N
29	2026-01	23	278	32	월사용료	365200	33200	2026-01-02	완료	2026-01-05	82	\N	2026-01-05 21:07:22.361788	2026-01-05 21:11:38.747064	t	2026-01-05	\N
30	2026-01	29	299	37	월사용료	327798	29800	2026-01-06	완료	2026-01-06	83	\N	2026-01-06 16:03:02.793381	2026-01-06 16:03:13.26328	f	\N	\N
31	2026-01	44	286	51	월사용료	250000	22727	2026-01-11	완료	2026-01-07	85	\N	2026-01-07 15:24:27.077558	2026-01-07 15:24:38.881875	f	\N	\N
\.


--
-- Data for Name: monthly_settlements; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.monthly_settlements (id, year, month, total_income, total_expense, net_profit, occupancy_rate, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.rooms (id, room_number, room_type, floor, area_sqm, base_price, status, position_x, position_y, width, height, created_at, updated_at, card_x, card_y, card_width, card_height, last_company_name, contract_ended_at) FROM stdin;
285	10	1인실	3	\N	550000	공실	110	120	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:36:36.042526	1620	209	176	80	\N	\N
281	6	1인실	3	\N	550000	입주	470	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:59:21.910519	1336	0	140	130	\N	\N
313	F3	자유석	3	\N	200000	공실	760	110	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:44:03.274486	469	0	160	80	\N	\N
292	17	1인실	3	\N	550000	입주	110	220	80	80	2025-12-26 14:12:41.102991	2025-12-26 20:03:45.886287	1620	859	178	132	\N	\N
307	32	1인실	3	\N	550000	입주	200	420	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:15:14.144261	0	391	150	129	\N	\N
306	31	1인실	3	\N	550000	공실	110	420	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:47:25.771046	1283	637	180	100	\N	\N
311	F1	자유석	3	\N	200000	공실	760	20	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:43:48.229402	152	0	158	80	\N	\N
309	34	1인실	3	\N	550000	입주	380	420	80	80	2025-12-26 14:12:41.102991	2025-12-26 16:15:00.917117	0	133	150	131	\N	\N
317	PB001	POST BOX	3	\N	50000	입주	10	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 18:55:39.556776	\N	\N	180	100	\N	\N
327	PB011	POST BOX	3	\N	50000	공실	10	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
328	PB012	POST BOX	3	\N	50000	공실	52	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
329	PB013	POST BOX	3	\N	50000	공실	94	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
330	PB014	POST BOX	3	\N	50000	공실	136	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
331	PB015	POST BOX	3	\N	50000	공실	178	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
332	PB016	POST BOX	3	\N	50000	공실	220	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
333	PB017	POST BOX	3	\N	50000	공실	262	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
334	PB018	POST BOX	3	\N	50000	공실	304	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
335	PB019	POST BOX	3	\N	50000	공실	346	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
336	PB020	POST BOX	3	\N	50000	공실	388	48	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
337	PB021	POST BOX	3	\N	50000	공실	10	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
338	PB022	POST BOX	3	\N	50000	공실	52	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
339	PB023	POST BOX	3	\N	50000	공실	94	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
340	PB024	POST BOX	3	\N	50000	공실	136	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
341	PB025	POST BOX	3	\N	50000	공실	178	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
342	PB026	POST BOX	3	\N	50000	공실	220	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
343	PB027	POST BOX	3	\N	50000	공실	262	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
344	PB028	POST BOX	3	\N	50000	공실	304	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
345	PB029	POST BOX	3	\N	50000	공실	346	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
288	13	1인실	3	\N	550000	공실	420	120	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:46:24.388794	1620	491	177	80	\N	\N
284	9	1인실	3	\N	550000	공실	20	120	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:36:33.795414	1618	129	179	80	\N	\N
277	2	1인실	3	\N	550000	계약종료	110	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 20:43:36.382561	775	1	140	128	어반리매핑	2025-10-30 15:00:00
300	25	1인실	3	\N	550000	공실	200	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 19:46:08.262175	1074	223	180	100	\N	\N
310	35	6인실	3	\N	2500000	입주	470	420	160	120	2025-12-26 14:12:41.102991	2025-12-26 16:14:58.324268	0	0	150	134	\N	\N
297	22	1인실	3	\N	550000	공실	560	220	80	80	2025-12-26 14:12:41.102991	2025-12-26 19:46:25.276095	1074	556	180	100	\N	\N
308	33	1인실	3	\N	550000	입주	290	420	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:15:25.198036	0	264	149	130	\N	\N
282	7	1인실	3	\N	550000	입주	560	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:59:13.034865	1477	0	140	129	\N	\N
316	F6	자유석	3	\N	200000	공실	870	200	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:44:30.070763	479	432	158	89	\N	\N
279	4	1인실	3	\N	550000	공실	290	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:59:34.765269	1056	0	140	85	\N	\N
286	11	2인실	3	\N	900000	입주	200	120	100	80	2025-12-26 14:12:41.102991	2026-01-07 15:23:43.657853	1620	286	180	128	스디끼	2025-11-14 15:00:00
312	F2	자유석	3	\N	200000	공실	870	20	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:44:04.681107	310	0	160	81	\N	\N
283	8	2인실	3	\N	900000	입주	650	20	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:37:12.253597	1617	0	178	130	\N	\N
287	12	2인실	3	\N	900000	공실	310	120	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:46:21.407914	1620	413	177	80	\N	\N
315	F5	자유석	3	\N	200000	공실	760	200	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:44:34.154456	315	431	163	89	\N	\N
298	23	1인실	3	\N	550000	공실	20	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:40:44.321667	1074	456	180	100	\N	\N
278	3	1인실	3	\N	550000	입주	200	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 17:59:42.59571	915	0	140	129	\N	\N
280	5	1인실	3	\N	550000	입주	380	20	80	80	2025-12-26 14:12:41.102991	2025-12-26 20:05:29.818087	1195	0	142	127	\N	\N
294	19	1인실	3	\N	550000	입주	290	220	80	80	2025-12-26 14:12:41.102991	2026-01-02 22:23:20.960333	1257	865	182	127	\N	\N
291	16	1인실	3	\N	550000	입주	20	220	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:46:34.826725	1620	731	180	128	\N	\N
289	14	1인실	3	\N	550000	공실	510	120	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:46:30.818437	1620	570	177	80	\N	\N
290	15	1인실	3	\N	550000	공실	600	120	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:46:32.600134	1620	650	181	80	\N	\N
319	PB003	POST BOX	3	\N	50000	입주	94	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:52:44.910655	\N	\N	180	100	\N	\N
320	PB004	POST BOX	3	\N	50000	입주	136	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:54:02.450263	\N	\N	180	100	\N	\N
314	F4	자유석	3	\N	200000	공실	870	110	100	80	2025-12-26 14:12:41.102991	2025-12-26 18:44:36.510438	150	430	163	90	\N	\N
276	1	1인실	3	\N	550000	입주	20	20	80	80	2025-12-26 14:12:41.102991	2026-01-02 22:24:03.701707	630	0	145	133	\N	\N
299	24	1인실	3	\N	550000	입주	110	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 19:46:17.072573	1073	323	179	130	\N	\N
293	18	1인실	3	\N	550000	공실	200	220	80	80	2025-12-26 14:12:41.102991	2026-01-02 22:23:18.782269	1437	893	183	99	\N	\N
303	28	1인실	3	\N	550000	공실	470	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:47:19.639425	1280	385	180	100	\N	\N
302	27	1인실	3	\N	550000	공실	380	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:47:17.739012	1278	303	180	100	\N	\N
305	30	1인실	3	\N	550000	공실	20	420	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:47:23.872405	1283	561	180	100	\N	\N
304	29	1인실	3	\N	550000	공실	560	320	80	80	2025-12-26 14:12:41.102991	2025-12-26 18:47:21.522281	1282	470	180	100	\N	\N
318	PB002	POST BOX	3	\N	50000	입주	52	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 18:57:28.023741	\N	\N	180	100	\N	\N
296	21	1인실	3	\N	550000	입주	470	220	80	80	2025-12-26 14:12:41.102991	2025-12-26 19:46:22.062261	1074	658	181	127	\N	\N
321	PB005	POST BOX	3	\N	50000	입주	178	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:55:27.676072	\N	\N	180	100	\N	\N
325	PB009	POST BOX	3	\N	50000	입주	346	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 22:06:59.132066	\N	\N	180	100	\N	\N
322	PB006	POST BOX	3	\N	50000	입주	220	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:56:26.567238	\N	\N	180	100	\N	\N
323	PB007	POST BOX	3	\N	50000	입주	262	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:57:37.236452	\N	\N	180	100	\N	\N
324	PB008	POST BOX	3	\N	50000	입주	304	10	38	34	2025-12-26 14:12:41.102991	2025-12-26 20:59:06.609062	\N	\N	180	100	\N	\N
295	20	1인실	3	\N	550000	계약종료	380	220	80	80	2025-12-26 14:12:41.102991	2026-01-02 22:23:24.395832	1063	867	192	131	이동현	2025-12-16 15:00:00
326	PB010	POST BOX	3	\N	50000	입주	388	10	38	34	2025-12-26 14:12:41.102991	2025-12-29 15:40:26.04142	\N	\N	180	100	\N	\N
301	26	1인실	3	\N	550000	공실	290	320	80	80	2025-12-26 14:12:41.102991	2025-12-30 16:32:19.281653	815	193	180	100	\N	\N
346	PB030	POST BOX	3	\N	50000	공실	388	86	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
347	PB031	POST BOX	3	\N	50000	공실	10	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
348	PB032	POST BOX	3	\N	50000	공실	52	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
349	PB033	POST BOX	3	\N	50000	공실	94	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
350	PB034	POST BOX	3	\N	50000	공실	136	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
351	PB035	POST BOX	3	\N	50000	공실	178	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
352	PB036	POST BOX	3	\N	50000	공실	220	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
353	PB037	POST BOX	3	\N	50000	공실	262	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
354	PB038	POST BOX	3	\N	50000	공실	304	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
355	PB039	POST BOX	3	\N	50000	공실	346	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
356	PB040	POST BOX	3	\N	50000	공실	388	124	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
357	PB041	POST BOX	3	\N	50000	공실	10	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
358	PB042	POST BOX	3	\N	50000	공실	52	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
359	PB043	POST BOX	3	\N	50000	공실	94	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
360	PB044	POST BOX	3	\N	50000	공실	136	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
361	PB045	POST BOX	3	\N	50000	공실	178	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
362	PB046	POST BOX	3	\N	50000	공실	220	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
363	PB047	POST BOX	3	\N	50000	공실	262	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
364	PB048	POST BOX	3	\N	50000	공실	304	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
365	PB049	POST BOX	3	\N	50000	공실	346	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
366	PB050	POST BOX	3	\N	50000	공실	388	162	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
367	PB051	POST BOX	3	\N	50000	공실	10	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
368	PB052	POST BOX	3	\N	50000	공실	52	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
369	PB053	POST BOX	3	\N	50000	공실	94	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
370	PB054	POST BOX	3	\N	50000	공실	136	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
371	PB055	POST BOX	3	\N	50000	공실	178	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
372	PB056	POST BOX	3	\N	50000	공실	220	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
373	PB057	POST BOX	3	\N	50000	공실	262	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
374	PB058	POST BOX	3	\N	50000	공실	304	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
375	PB059	POST BOX	3	\N	50000	공실	346	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
376	PB060	POST BOX	3	\N	50000	공실	388	200	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
377	PB061	POST BOX	3	\N	50000	공실	10	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
378	PB062	POST BOX	3	\N	50000	공실	52	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
379	PB063	POST BOX	3	\N	50000	공실	94	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
380	PB064	POST BOX	3	\N	50000	공실	136	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
381	PB065	POST BOX	3	\N	50000	공실	178	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
382	PB066	POST BOX	3	\N	50000	공실	220	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
383	PB067	POST BOX	3	\N	50000	공실	262	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
384	PB068	POST BOX	3	\N	50000	공실	304	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
385	PB069	POST BOX	3	\N	50000	공실	346	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
386	PB070	POST BOX	3	\N	50000	공실	388	238	38	34	2025-12-26 14:12:41.102991	2025-12-26 14:12:41.102991	\N	\N	180	100	\N	\N
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.tenants (id, company_name, representative_name, business_number, email, phone, address, notes, created_at, updated_at, tenant_type) FROM stdin;
34	어반리매핑	이승희				\N	\N	2025-12-26 18:28:51.741172	2025-12-26 20:42:52.054734	상주
38	스디끼	스디끼 성민				\N	\N	2025-12-26 18:45:57.914404	2025-12-26 20:43:52.748952	상주
41	이동현	이동현				\N	\N	2025-12-26 20:12:05.285244	2025-12-26 20:44:26.245333	상주
31	초대박	최성일			010-3458-3418	\N	\N	2025-12-26 17:39:35.923559	2025-12-26 22:00:27.20011	상주
30	쿼드	이윤혜	4378602150	doors0317@naver.com	01051069646	\N	\N	2025-12-26 17:37:44.14987	2025-12-26 22:00:37.840205	상주
37	고선희	고선희				\N	\N	2025-12-26 18:41:58.708289	2025-12-26 22:01:19.205648	상주
29	KJ	김영진				\N	\N	2025-12-26 17:33:08.477932	2025-12-27 02:00:16.133297	상주
23	Glancey	정대선	8488803843	daeseon.jeong@glancey.io	01088800830	\N	\N	2025-12-26 16:04:00.394466	2025-12-29 20:52:59.408667	상주
32	법률사무소 김호정	김호정	2672402039		010-3262-2575	\N	\N	2025-12-26 17:53:49.740346	2025-12-29 20:56:22.956837	상주
35	댕스소셜클럽	방서진	1763501609	bsj@thankssocialclub.com	01094944362	\N	\N	2025-12-26 18:33:15.709285	2025-12-29 21:14:22.136551	상주
28	진진관	이진수	136-30-01436	work_jsl657@naver.com	010-5061-1903	\N	\N	2025-12-26 17:28:26.693009	2025-12-29 21:19:36.352841	상주
44	메이플팝	서지의	489-04-03299	jieuis123@gmail.com	010-5229-6577	\N	\N	2025-12-26 20:55:27.633788	2025-12-29 21:22:15.478218	비상주
45	히트엔터테인먼트	최종진	832-81-02345	hit_ent@naver.com	01062162744	\N	\N	2025-12-26 20:56:26.518449	2025-12-29 21:24:01.003514	비상주
27	정석 공인중개사	이명재	2271622935	mj_rs83@naver.com	01073636253	\N	\N	2025-12-26 16:17:12.552905	2025-12-29 21:30:35.21305	상주
26	법률사무소 공륜	장미령	5326600798	alfud1086@gmail.com	01073761086	\N	\N	2025-12-26 16:14:35.987204	2025-12-29 21:39:44.770147	상주
25	채우리	유채리		chaeriu97@gmail.com	01093579860	\N	\N	2025-12-26 16:11:41.253559	2025-12-29 21:50:26.900502	상주
40	윈앤썸	서지의	130111-0127299	jieuis123@gmail.com	01052296577	\N	\N	2025-12-26 18:57:27.991848	2025-12-29 22:11:29.077757	비상주
48	라코네(Lacone)	채정미	278-11-02271	0807cjm@naver.com	01051615649	\N	\N	2025-12-26 22:06:59.088121	2025-12-29 22:13:41.490386	비상주
33	법률사무소 김수빈	김수빈		soupkong@naver.com	01064277715	\N	\N	2025-12-26 17:58:47.188386	2025-12-31 16:39:49.535438	상주
47	볼드	송진탁	461-07-02051	hdiylove@naver.com	01092815765	\N	\N	2025-12-26 20:59:06.589686	2025-12-31 16:50:04.404291	비상주
46	우리들클린케어	박신영		bsy6121@naver.com	01079426121	\N	\N	2025-12-26 20:57:37.221471	2025-12-31 16:57:32.50645	비상주
42	젠레이어(ZenLayer)	박세정	3134501041	valueable400@gmail.com	01031858356	\N	\N	2025-12-26 20:52:44.868159	2025-12-31 17:02:57.934535	비상주
43	조성진 법률사무소	조성진		jo8974@gm ail.com	01057068974	\N	\N	2025-12-26 20:54:02.408036	2025-12-31 17:05:25.852479	비상주
39	뷰티로드	이향숙	134511-0074352	lhslhs2036@gmail.com	010-2466-8896	\N	\N	2025-12-26 18:55:39.508104	2025-12-31 17:09:49.072806	비상주
49	케이 시그널	추송원		csw4750@naver.com	01062024754	\N	\N	2025-12-29 15:40:25.976616	2025-12-31 17:14:09.139992	비상주
36	김준형	김준형				\N	\N	2025-12-26 18:40:21.436327	2026-01-02 19:58:53.486598	상주
50	문성빈	문성빈				\N	\N	2026-01-02 22:21:23.191269	2026-01-02 22:21:23.191269	상주
51	하태룡	하태룡		hangil247@naver.com	010-7668-9797	\N	\N	2026-01-07 15:23:43.612509	2026-01-07 15:23:43.612509	상주
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: bomeewoo
--

COPY public.transactions (id, contract_id, tenant_id, type, category, amount, transaction_date, description, payment_method, receipt_number, created_at, updated_at, room_id, billing_id, vat_amount, due_date, status, receipt_file, notes, tax_invoice_issued, tax_invoice_date, tax_invoice_number) FROM stdin;
4	34	42	입금	비상주사용료	198000	2025-10-24	POST BOX 003 젠레이어(ZenLayer) 비상주 사용료	\N	\N	2025-12-26 20:52:44.912143	2025-12-26 20:52:44.912143	319	\N	0	\N	완료	\N	\N	f	\N	\N
5	35	43	입금	비상주사용료	99000	2025-10-28	POST BOX 004 조성진 법률사무소 비상주 사용료	\N	\N	2025-12-26 20:54:02.45096	2025-12-26 20:54:02.45096	320	\N	0	\N	완료	\N	\N	f	\N	\N
6	36	44	입금	비상주사용료	198000	2025-11-04	POST BOX 005 메이플팝 비상주 사용료	\N	\N	2025-12-26 20:55:27.676891	2025-12-26 20:55:27.676891	321	\N	0	\N	완료	\N	\N	f	\N	\N
7	37	45	입금	비상주사용료	198000	2025-11-12	POST BOX 006 히트엔터테인먼트 비상주 사용료	\N	\N	2025-12-26 20:56:26.567833	2025-12-26 20:56:26.567833	322	\N	0	\N	완료	\N	\N	f	\N	\N
8	38	46	입금	비상주사용료	396000	2025-12-26	POST BOX 007 우리들클린케어 비상주 사용료	\N	\N	2025-12-26 20:57:37.236985	2025-12-26 20:57:37.236985	323	\N	0	\N	완료	\N	\N	f	\N	\N
9	39	47	입금	비상주사용료	396000	2025-12-01	POST BOX 008 볼드 비상주 사용료	\N	\N	2025-12-26 20:59:06.610393	2025-12-26 20:59:06.610393	324	\N	0	\N	완료	\N	\N	f	\N	\N
2	\N	34	입금	위약금	376200	2025-10-30	2호 어반리매핑 중도해지 위약금	\N	\N	2025-12-26 20:43:36.368949	2025-12-26 20:43:36.368949	277	\N	0	\N	완료	\N	\N	f	\N	\N
3	\N	38	입금	위약금	300000	2025-11-14	11호 스디끼 중도해지 위약금	\N	\N	2025-12-26 20:44:08.019394	2025-12-26 20:44:08.019394	286	\N	0	\N	완료	\N	\N	f	\N	\N
10	40	48	입금	비상주사용료	99000	2025-12-12	POST BOX 009 라코네(Lacone) 비상주 사용료	\N	\N	2025-12-26 22:06:59.132838	2025-12-26 22:06:59.132838	325	\N	0	\N	완료	\N	\N	f	\N	\N
11	24	33	입금	월사용료	407550	2025-12-18	1호 법률사무소 김수빈 2025-12 월사용료	계좌이체	\N	2025-12-26 22:28:56.364111	2025-12-26 22:28:56.364111	276	1	37050	\N	완료	\N		f	\N	\N
12	17	26	입금	월사용료	390000	2025-12-22	33호 법률사무소 공륜 2025-12 월사용료	계좌이체	\N	2025-12-26 22:30:08.57973	2025-12-26 22:30:08.57973	308	2	35455	\N	완료	\N		f	\N	\N
13	18	27	입금	월사용료	253000	2025-12-20	32호 정석 공인중개사 2025-12 월사용료	계좌이체	\N	2025-12-26 22:31:43.882098	2025-12-26 22:31:43.882098	307	3	23000	\N	완료	\N		f	\N	\N
14	15	23	입금	월사용료	825000	2025-12-15	35호 Glancey 2025-12 월사용료	계좌이체	\N	2025-12-26 22:32:16.590559	2025-12-26 22:32:16.590559	310	4	75000	\N	완료	\N		f	\N	\N
15	16	25	입금	월사용료	316800	2025-12-13	34호 채우리 2025-12 월사용료	계좌이체	\N	2025-12-26 22:32:42.906436	2025-12-26 22:32:42.906436	309	5	28800	\N	완료	\N		f	\N	\N
16	19	28	입금	월사용료	410000	2025-12-01	8호 진진관 2025-12 월사용료	계좌이체	\N	2025-12-26 22:33:06.316879	2025-12-26 22:33:06.316879	283	6	37273	\N	완료	\N		f	\N	\N
17	23	32	입금	월사용료	365200	2025-12-04	3호 법률사무소 김호정 2025-12 월사용료	계좌이체	\N	2025-12-26 22:33:31.260073	2025-12-26 22:33:31.260073	278	7	33200	\N	완료	\N		f	\N	\N
18	22	31	입금	월사용료	275000	2025-12-01	5호 초대박 2025-12 월사용료	계좌이체	\N	2025-12-26 22:33:47.818815	2025-12-26 22:33:47.818815	280	8	25000	\N	완료	\N		f	\N	\N
19	20	29	입금	월사용료	408100	2025-12-10	7호 KJ 2025-12 월사용료	계좌이체	\N	2025-12-26 22:35:23.328603	2025-12-26 22:35:23.328603	282	9	37100	\N	완료	\N	12/10 일시불 3개월치	f	\N	\N
20	27	35	입금	월사용료	460000	2025-12-01	17호 댕스소셜클럽 2025-12 월사용료	계좌이체	\N	2025-12-27 00:08:47.384297	2025-12-27 00:08:47.384297	292	11	41818	\N	완료	\N		f	\N	\N
21	29	37	입금	월사용료	327798	2025-12-07	24호 고선희 2025-12 월사용료	카드	\N	2025-12-27 00:14:30.98801	2025-12-27 00:14:30.98801	299	12	29800	\N	완료	\N	11월에 선납	f	\N	\N
22	21	30	입금	월사용료	364646	2025-12-27	6호 쿼드 2025-12 월사용료	계좌이체	\N	2025-12-27 00:14:34.518307	2025-12-27 00:14:34.518307	281	10	33150	\N	완료	\N		f	\N	\N
24	32	40	입금	비상주사용료	198000	2025-10-20	윈앤썸 비상주 사용료 (2025.10~2026.04)	\N	\N	2025-12-27 00:47:26.669709	2025-12-27 00:47:26.669709	318	\N	0	\N	완료	\N	\N	f	\N	\N
25	15	23	입금	월사용료	825000	2025-09-13	35호 Glancey 2025-09 월사용료	계좌이체	\N	2025-12-27 00:48:35.859668	2025-12-27 00:48:35.859668	310	13	75000	\N	완료	\N		f	\N	\N
26	20	29	입금	월사용료	408100	2025-09-22	7호 KJ 2025-09 월사용료	계좌이체	\N	2025-12-27 00:49:01.456332	2025-12-27 00:49:01.456332	282	14	37100	\N	완료	\N		f	\N	\N
27	20	29	입금	월사용료	408100	2025-09-22	7호 KJ 2025-10 월사용료	계좌이체	\N	2025-12-27 00:56:19.495628	2025-12-27 00:56:19.495628	282	15	37100	\N	완료	\N	2025-12-21 사용료까지 선납	f	\N	\N
28	20	29	입금	월사용료	408100	2025-09-22	7호 KJ 2025-11 월사용료	계좌이체	\N	2025-12-27 00:56:46.141295	2025-12-27 00:56:46.141295	282	16	37100	\N	완료	\N	2025-12-21 사용료까지 선납	f	\N	\N
23	31	39	입금	비상주사용료	304000	2025-09-14	뷰티로드 비상주 사용료 (2025.09~2026.09)	계좌이체	\N	2025-12-27 00:47:26.669709	2025-12-27 00:57:56.194863	317	\N	0	\N	완료	\N		f	\N	\N
29	19	28	입금	월사용료	410000	2025-10-01	8호 진진관 2025-10 월사용료	계좌이체	\N	2025-12-27 00:59:39.321878	2025-12-27 00:59:39.321878	283	17	37273	\N	완료	\N	10/18에 입금	f	\N	\N
30	18	27	입금	월사용료	253000	2025-10-20	32호 정석 공인중개사 2025-10 월사용료	계좌이체	\N	2025-12-27 01:00:17.179285	2025-12-27 01:00:17.179285	307	18	23000	\N	완료	\N		f	\N	\N
31	18	27	입금	월사용료	253000	2025-11-20	32호 정석 공인중개사 2025-11 월사용료	계좌이체	\N	2025-12-27 01:01:14.0891	2025-12-27 01:01:14.0891	307	19	23000	\N	완료	\N		f	\N	\N
32	16	25	입금	월사용료	316800	2025-10-13	34호 채우리 2025-10 월사용료	계좌이체	\N	2025-12-27 01:01:50.987664	2025-12-27 01:01:50.987664	309	20	28800	\N	완료	\N		f	\N	\N
33	16	25	입금	월사용료	316800	2025-11-13	34호 채우리 2025-11 월사용료	계좌이체	\N	2025-12-27 01:02:19.663327	2025-12-27 01:02:19.663327	309	21	28800	\N	완료	\N	1/18 입금	f	\N	\N
34	15	23	입금	월사용료	825000	2025-10-15	35호 Glancey 2025-10 월사용료	계좌이체	\N	2025-12-27 01:05:09.992516	2025-12-27 01:05:09.992516	310	22	75000	\N	완료	\N		f	\N	\N
35	15	23	입금	월사용료	825000	2025-11-15	35호 Glancey 2025-11 월사용료	계좌이체	\N	2025-12-27 01:06:31.32038	2025-12-27 01:06:31.32038	310	23	75000	\N	완료	\N	11/17 입금	f	\N	\N
36	23	32	입금	월사용료	365200	2025-11-03	3호 법률사무소 김호정 2025-11 월사용료	계좌이체	\N	2025-12-27 01:07:55.062533	2025-12-27 01:07:55.062533	278	24	33200	\N	완료	\N		f	\N	\N
37	19	28	입금	월사용료	410000	2025-11-05	8호 진진관 2025-11 월사용료	계좌이체	\N	2025-12-27 01:09:05.340274	2025-12-27 01:09:05.340274	283	25	37273	\N	완료	\N		f	\N	\N
38	33	41	입금	월사용료	429000	2025-11-04	20호 이동현 2025-11 월사용료	계좌이체	\N	2025-12-27 01:09:59.513769	2025-12-27 01:09:59.513769	295	26	39000	\N	완료	\N		f	\N	\N
39	28	36	입금	월사용료	385000	2025-11-03	21호 김준형 2025-11 월사용료	계좌이체	\N	2025-12-27 01:10:54.422487	2025-12-27 01:10:54.422487	296	27	35000	\N	완료	\N		f	\N	\N
40	29	37	입금	월사용료	327798	2025-11-07	24호 고선희 2025-11 월사용료	카드	\N	2025-12-27 01:11:37.887528	2025-12-27 01:11:37.887528	299	28	29800	\N	완료	\N	11월, 12월 분 카드결제함	f	\N	\N
41	16	25	입금	보증금입금	316800	2025-10-14	채우리 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	309	\N	0	\N	완료	\N	\N	f	\N	\N
42	17	26	입금	보증금입금	390000	2025-12-22	법률사무소 공륜 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	308	\N	0	\N	완료	\N	\N	f	\N	\N
43	18	27	입금	보증금입금	253000	2025-10-20	정석 공인중개사 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	307	\N	0	\N	완료	\N	\N	f	\N	\N
44	19	28	입금	보증금입금	410000	2025-10-01	진진관 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	283	\N	0	\N	완료	\N	\N	f	\N	\N
46	21	30	입금	보증금입금	364650	2025-12-29	쿼드 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	281	\N	0	\N	완료	\N	\N	f	\N	\N
47	23	32	입금	보증금입금	365200	2025-11-03	법률사무소 김호정 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	278	\N	0	\N	완료	\N	\N	f	\N	\N
48	24	33	입금	보증금입금	407550	2025-12-18	법률사무소 김수빈 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	276	\N	0	\N	완료	\N	\N	f	\N	\N
49	25	34	입금	보증금입금	376200	2025-10-01	어반리매핑 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	277	\N	0	\N	완료	\N	\N	f	\N	\N
50	26	35	입금	보증금입금	320000	2026-01-12	댕스소셜클럽 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	291	\N	0	\N	완료	\N	\N	f	\N	\N
51	27	35	입금	보증금입금	460000	2025-12-01	댕스소셜클럽 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	292	\N	0	\N	완료	\N	\N	f	\N	\N
52	29	37	입금	보증금입금	327800	2025-11-07	고선희 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	299	\N	0	\N	완료	\N	\N	f	\N	\N
53	30	38	입금	보증금입금	300000	2025-10-15	스디끼 보증금 입금	\N	\N	2025-12-27 01:52:58.658915	2025-12-27 01:52:58.658915	286	\N	0	\N	완료	\N	\N	f	\N	\N
54	\N	\N	지출	관리비	426106	2025-09-11	301호 관리비	계좌이체	\N	2025-12-27 02:14:25.853422	2025-12-27 02:14:25.853422	\N	\N	0	\N	완료	\N		f	\N	\N
55	\N	\N	지출	관리비	665520	2025-09-11	302호 관리비	계좌이체	\N	2025-12-27 02:21:26.355592	2025-12-27 02:21:26.355592	\N	\N	0	\N	완료	\N		f	\N	\N
56	\N	\N	지출	임대료	4950000	2025-10-30	오레오피스 임대료	계좌이체	\N	2025-12-27 02:22:14.082357	2025-12-27 02:22:14.082357	\N	\N	0	\N	완료	\N		f	\N	\N
57	\N	\N	지출	기타지출	1000000	2025-10-20	관리비 선수금	계좌이체	\N	2025-12-27 02:23:11.808141	2025-12-27 02:23:11.808141	\N	\N	0	\N	완료	\N	맡겨놓는 금액	f	\N	\N
58	\N	\N	지출	관리비	735390	2025-10-20	301호 관리비	계좌이체	\N	2025-12-27 02:23:39.962274	2025-12-27 02:23:39.962274	\N	\N	0	\N	완료	\N		f	\N	\N
59	\N	\N	지출	관리비	803100	2025-10-20	302호 관리비	계좌이체	\N	2025-12-27 02:24:03.427944	2025-12-27 02:24:03.427944	\N	\N	0	\N	완료	\N		f	\N	\N
61	\N	\N	지출	관리비	732670	2025-11-16	301호 관리비	계좌이체	\N	2025-12-27 08:20:32.446371	2025-12-27 08:20:32.446371	\N	\N	0	\N	완료	\N	488 계좌에서 출금	f	\N	\N
62	\N	\N	지출	관리비	577070	2025-11-16	302호 관리비	계좌이체	\N	2025-12-27 08:21:26.681288	2025-12-27 08:21:26.681288	\N	\N	0	\N	완료	\N	488 계좌에서 출금	f	\N	\N
63	\N	\N	지출	관리비	617670	2025-12-15	301호 관리비	계좌이체	\N	2025-12-27 08:22:29.705004	2025-12-27 08:22:29.705004	\N	\N	0	\N	완료	\N		f	\N	\N
64	\N	\N	지출	관리비	775090	2025-12-12	302호 관리비	계좌이체	\N	2025-12-27 08:23:21.943564	2025-12-27 08:23:21.943564	\N	\N	0	\N	완료	\N		f	\N	\N
60	\N	\N	지출	임대료	4950000	2025-11-29	오레오피스 임대료	계좌이체	\N	2025-12-27 02:25:11.279782	2025-12-27 08:23:42.411021	\N	\N	0	\N	완료	\N	12/1 이체	f	\N	\N
65	\N	\N	지출	임대료	4950000	2025-12-29	오레오피스 임대료	계좌이체	\N	2025-12-27 08:26:11.540904	2025-12-27 08:26:23.710769	\N	\N	0	\N	완료	\N	12/30 자동이체	f	\N	\N
66	21	30	입금	월사용료	364646	2025-12-29	6호 쿼드 2025-12 월사용료	계좌이체	\N	2025-12-29 14:19:02.973302	2025-12-29 14:19:02.973302	281	10	33150	\N	완료	\N		f	\N	\N
67	41	49	입금	비상주사용료	99000	2026-01-01	POST BOX 010 케이 시그널 비상주 사용료	\N	\N	2025-12-29 15:40:26.042053	2025-12-29 15:40:26.042053	326	\N	0	\N	완료	\N	\N	f	\N	\N
68	\N	\N	지출	마케팅	100000	2025-10-05	네이버광고	현금	\N	2026-01-02 19:23:19.779618	2026-01-02 19:23:19.779618	\N	\N	0	\N	완료	\N	네이버페이	f	\N	\N
69	\N	\N	지출	마케팅	300000	2025-11-13	네이버광고	카드	\N	2026-01-02 19:24:26.55624	2026-01-02 19:24:26.55624	\N	\N	0	\N	완료	\N	개인카드	f	\N	\N
70	\N	\N	지출	마케팅	300000	2025-12-13	네이버광고	현금	\N	2026-01-02 19:25:36.317678	2026-01-02 19:25:36.317678	\N	\N	0	\N	완료	\N	네이버페이	f	\N	\N
71	\N	\N	지출	마케팅	110000	2025-12-27	네이버광고	카드	\N	2026-01-02 19:27:41.471265	2026-01-02 19:27:41.471265	\N	\N	0	\N	완료	\N	개인카드	f	\N	\N
72	\N	\N	지출	마케팅	30000	2025-12-13	당근광고	현금	\N	2026-01-02 19:35:00.910836	2026-01-02 19:35:00.910836	\N	\N	0	\N	완료	\N		f	\N	\N
73	\N	\N	지출	마케팅	20000	2025-12-10	당근광고	현금	\N	2026-01-02 19:35:44.376688	2026-01-02 19:35:44.376688	\N	\N	0	\N	완료	\N		f	\N	\N
74	\N	\N	지출	마케팅	50000	2025-11-04	당근광고	현금	\N	2026-01-02 19:36:46.015433	2026-01-02 19:36:46.015433	\N	\N	0	\N	완료	\N		f	\N	\N
75	\N	\N	지출	마케팅	30000	2025-11-17	당근광고	계좌이체	\N	2026-01-02 19:37:22.991002	2026-01-02 19:37:22.991002	\N	\N	0	\N	완료	\N		f	\N	\N
76	\N	\N	지출	마케팅	20000	2025-11-22	당근광고	계좌이체	\N	2026-01-02 19:38:25.024982	2026-01-02 19:38:25.024982	\N	\N	0	\N	완료	\N		f	\N	\N
77	\N	\N	지출	마케팅	42000	2025-11-30	당근광고	현금	\N	2026-01-02 19:38:52.643534	2026-01-02 19:38:52.643534	\N	\N	0	\N	완료	\N		f	\N	\N
78	\N	\N	지출	마케팅	150000	2025-09-25	당근광고	현금	\N	2026-01-02 19:40:28.402065	2026-01-02 19:40:28.402065	\N	\N	0	\N	완료	\N		f	\N	\N
80	28	36	입금	보증금입금	346500	2026-01-01	김준형 보증금 입금	\N	\N	2026-01-02 19:58:53.515892	2026-01-02 19:58:53.515892	296	\N	0	\N	완료	\N	\N	f	\N	\N
81	43	50	입금	보증금입금	364648	2026-01-03	문성빈 보증금 입금	\N	\N	2026-01-02 22:21:23.285799	2026-01-02 22:21:23.285799	294	\N	0	\N	완료	\N	\N	f	\N	\N
82	23	32	입금	월사용료	365200	2026-01-05	3호 법률사무소 김호정 2026-01 월사용료	계좌이체	\N	2026-01-05 21:07:31.069682	2026-01-05 21:07:31.069682	278	29	33200	\N	완료	\N		f	\N	\N
83	29	37	입금	월사용료	327798	2026-01-06	24호 고선희 2026-01 월사용료	카드	\N	2026-01-06 16:03:13.24966	2026-01-06 16:03:13.24966	299	30	29800	\N	완료	\N		f	\N	\N
84	44	51	입금	보증금입금	250000	2026-01-12	하태룡 보증금 입금	\N	\N	2026-01-07 15:23:43.65852	2026-01-07 15:23:43.65852	286	\N	0	\N	완료	\N	\N	f	\N	\N
85	44	51	입금	월사용료	250000	2026-01-07	11호 하태룡 2026-01 월사용료	계좌이체	\N	2026-01-07 15:24:38.876055	2026-01-07 15:24:38.876055	286	31	22727	\N	완료	\N		f	\N	\N
\.


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.contracts_id_seq', 44, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: monthly_billings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.monthly_billings_id_seq', 31, true);


--
-- Name: monthly_settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.monthly_settlements_id_seq', 1, false);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.rooms_id_seq', 416, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.tenants_id_seq', 51, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bomeewoo
--

SELECT pg_catalog.setval('public.transactions_id_seq', 85, true);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: monthly_billings monthly_billings_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings
    ADD CONSTRAINT monthly_billings_pkey PRIMARY KEY (id);


--
-- Name: monthly_settlements monthly_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_settlements
    ADD CONSTRAINT monthly_settlements_pkey PRIMARY KEY (id);


--
-- Name: monthly_settlements monthly_settlements_year_month_key; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_settlements
    ADD CONSTRAINT monthly_settlements_year_month_key UNIQUE (year, month);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_room_number_key; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_room_number_key UNIQUE (room_number);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_billings_status; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_billings_status ON public.monthly_billings USING btree (status);


--
-- Name: idx_billings_tenant; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_billings_tenant ON public.monthly_billings USING btree (tenant_id);


--
-- Name: idx_billings_year_month; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_billings_year_month ON public.monthly_billings USING btree (year_month);


--
-- Name: idx_contracts_dates; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_contracts_dates ON public.contracts USING btree (start_date, end_date);


--
-- Name: idx_contracts_room_id; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_contracts_room_id ON public.contracts USING btree (room_id);


--
-- Name: idx_contracts_tenant_id; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_contracts_tenant_id ON public.contracts USING btree (tenant_id);


--
-- Name: idx_documents_contract_id; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_documents_contract_id ON public.documents USING btree (contract_id);


--
-- Name: idx_documents_tenant_id; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_documents_tenant_id ON public.documents USING btree (tenant_id);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (transaction_date);


--
-- Name: idx_transactions_room; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_transactions_room ON public.transactions USING btree (room_id);


--
-- Name: idx_transactions_tenant; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_transactions_tenant ON public.transactions USING btree (tenant_id);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: bomeewoo
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: contracts contracts_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documents documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: monthly_billings monthly_billings_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings
    ADD CONSTRAINT monthly_billings_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: monthly_billings monthly_billings_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings
    ADD CONSTRAINT monthly_billings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: monthly_billings monthly_billings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings
    ADD CONSTRAINT monthly_billings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: monthly_billings monthly_billings_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.monthly_billings
    ADD CONSTRAINT monthly_billings_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bomeewoo
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict wOivFZQ2iNlKICYxcWgr35qolPzgA3Teh9CFoAObMQfvfUcpE6Rn2yA366DIlrr

