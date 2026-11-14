import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import {
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  LogOut,
  ArrowUpRight,
  ArrowLeft,
  Search,
  RefreshCw,
  Plus,
  GraduationCap,
  ShieldCheck,
  Activity,
  ChevronRight,
  Check,
  BrainCircuit,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "./api.js";
const Context = createContext();
const colors = {
  GREEN: "#21816c",
  YELLOW: "#cd9138",
  RED: "#ca625b",
  UNKNOWN: "#8c9ca4",
};
const labels = {
  GREEN: "Thấp",
  YELLOW: "Cần theo dõi",
  RED: "Ưu tiên hỗ trợ",
  UNKNOWN: "Chưa đủ đánh giá",
};
const workflows = {
  NEW: "Mới",
  IN_PROGRESS: "Đang hỗ trợ",
  RESOLVED: "Đã xử lý",
};
const fmt = (x) => (x == null ? "—" : Number(x).toFixed(2));
const when = (x) => (x ? new Date(x).toLocaleString("vi-VN") : "");
function Badge({ level }) {
  return (
    <span className={`badge ${level || "UNKNOWN"}`}>
      <i />
      {labels[level] || labels.UNKNOWN}
    </span>
  );
}
function ErrorBox({ error }) {
  return error ? (
    <div role="alert" className="error">
      {error}
    </div>
  ) : null;
}
function useData(url) {
  const { revision } = useContext(Context);
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const requestId = useRef(0);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const d = await api(url);
      if (id === requestId.current) {
        setData(d);
        setError("");
      }
    } catch (e) {
      if (id === requestId.current) {
        setData(null);
        setError(e.message);
      }
    }
  }, [url]);
  useEffect(() => {
    setData(null);
    setError("");
  }, [url]);
  useEffect(() => {
    reload();
    return () => {
      requestId.current++;
    };
  }, [reload, revision]);
  return { data, error, reload };
}
function PageTitle({ eyebrow, title, children, actions }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </div>
  );
}
function Stat({ label, value, level, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">
        <span
          className="dot"
          style={{ background: colors[level] || "#35685e" }}
        />
        {label}
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function StudentTable({ items = [] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sinh viên</th>
            <th>Lớp</th>
            <th>Điểm tích lũy (CPA)</th>
            <th>Ưu tiên theo dõi</th>
            <th>Điểm ML demo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td>
                <Link className="person" to={`/students/${s.id}`}>
                  <span className="avatar">{s.name.split(" ").at(-1)[0]}</span>
                  <span>
                    <b>{s.name}</b>
                    <small>{s.code}</small>
                  </span>
                </Link>
              </td>
              <td>{s.className}</td>
              <td>{fmt(s.cpa)}</td>
              <td>
                <Badge level={s.priority} />
              </td>
              <td>
                {s.probability == null
                  ? "—"
                  : `${Math.round(s.probability * 100)}%`}
              </td>
              <td>
                <Link aria-label={`Xem ${s.name}`} to={`/students/${s.id}`}>
                  <ArrowUpRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="empty">Chưa có sinh viên phù hợp.</div>}
    </div>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState("cvht.a@edualert.local"),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onLogin(await api("/auth/login", "POST", { email, password }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <GraduationCap /> EduAlert<span>ACADEMIC CARE</span>
        </div>
        <span className="eyebrow">MỘT GÓC NHÌN SỚM HƠN</span>
        <h1>
          Nhìn thấy dấu hiệu.
          <br />
          Đồng hành đúng lúc.
        </h1>
        <p>
          Theo dõi hành trình học tập, nhận diện nguy cơ và dành sự hỗ trợ cho
          những sinh viên cần bạn nhất.
        </p>
        <div className="story-lines">
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
      <div className="login-form">
        <form onSubmit={submit}>
          <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
          <h2>Đăng nhập EduAlert</h2>
          <p>Sử dụng tài khoản quản trị hoặc cố vấn học tập.</p>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <ErrorBox error={error} />
          <button disabled={busy} className="primary full">
            {busy ? "Đang đăng nhập…" : "Đăng nhập"} <ArrowUpRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
export default function App() {

  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0),
    [online, setOnline] = useState(false),
    [toast, setToast] = useState("");
  const refresh = () => setRevision((v) => v + 1);
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (!user) return;
    const socket = io({ withCredentials: true });
    socket.on("connect", () => {
      setOnline(true);
      refresh();
    });
    socket.on("disconnect", () => setOnline(false));
    socket.on("academic:update", () => {
      refresh();
      setToast("Hồ sơ học tập vừa được cập nhật");
    });
    return () => socket.close();
  }, [user]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  if (!ready) return <div className="empty">Đang kết nối EduAlert…</div>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Context.Provider value={{ user, revision, refresh, setToast }}>
      <div className="shell">
        <aside className="sidebar">
          <Link to="/" className="brand">
            <GraduationCap size={28} />
            EduAlert<span>ACADEMIC CARE</span>
          </Link>
          <div className="nav-label">KHÔNG GIAN CỐ VẤN</div>
          <nav>
            <NavLink end to="/">
              <LayoutDashboard size={19} />
              Tổng quan
            </NavLink>
            <NavLink to="/students">
              <Users size={19} />
              Sinh viên
            </NavLink>
            <NavLink to="/alerts">
              <Bell size={19} />
              Trung tâm cảnh báo
            </NavLink>
            <NavLink to="/model">
              <BrainCircuit size={19} />
              Mô hình dự báo
            </NavLink>
            {user.role === "ADMIN" && (
              <NavLink to="/admin">
                <Settings size={19} />
                Quản trị dữ liệu
              </NavLink>
            )}
          </nav>
          <div className="side-note">
            <ShieldCheck size={24} />
            <b>Hỗ trợ quyết định</b>
            <p>
              Cảnh báo giúp ưu tiên tư vấn. Quyết định học vụ thuộc về nhà
              trường.
            </p>
          </div>
          <div className="user-box">
            <span className="avatar">{user.name[0]}</span>
            <div>
              <b>{user.name}</b>
              <small>
                {user.role === "ADMIN" ? "Quản trị viên" : "Cố vấn học tập"}
              </small>
            </div>
            <button
              className="icon"
              title="Đăng xuất"
              onClick={async () => {
                await api("/auth/logout", "POST");
                setUser(null);
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <main>
          <header className="topbar">
            <span>
              Hành trình học tập <ChevronRight size={14} /> EduAlert
            </span>
            <span className="connection">
              <i style={{ background: online ? "#20826c" : "#ce8b3d" }} />
              {online ? "Đã kết nối" : "Đang kết nối lại"}
            </span>
          </header>
          
          <div className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/model" element={<Model />} />
              <Route
                path="/admin"
                element={
                  user.role === "ADMIN" ? (
                    <Admin />
                  ) : (
                    <p>Bạn không có quyền truy cập.</p>
                  )
                }
              />
              <Route
                path="*"
                element={
                  <p>
                    Không tìm thấy trang. <Link to="/">Về tổng quan</Link>
                  </p>
                }
              />
            </Routes>
          </div>
        </main>
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
function Dashboard() {
  const { data, error } = useData("/dashboard");
  const { user, refresh, setToast } = useContext(Context);
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const assess = async () => {
    setBusy(true);
    try {
      const r = await api("/assess-all", "POST");
      refresh();
      setToast(`Đã đánh giá ${r.results.filter((x) => !x.error).length} hồ sơ`);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="TỔNG QUAN HỌC TẬP"
        title="Đồng hành cùng sinh viên"
        actions={
          user.role === "ADMIN" && (
            <button disabled={busy} className="primary" onClick={assess}>
              <RefreshCw size={16} />
              {busy ? "Đang đánh giá…" : "Đánh giá toàn bộ"}
            </button>
          )
        }
      >
        Nhìn rõ tiến độ. Nhận diện sớm. Hỗ trợ kịp thời.
      </PageTitle>
      <ErrorBox error={error || actionError} />
      {data && (
        <>
          <div className="stats">
            <Stat
              label="Sinh viên phụ trách"
              value={data.total}
              sub="Trong phạm vi của bạn"
            />
            <Stat
              label="Nguy cơ thấp"
              value={data.counts.GREEN}
              level="GREEN"
              sub="Theo kết quả demo mới nhất"
            />
            <Stat
              label="Cần theo dõi"
              value={data.counts.YELLOW}
              level="YELLOW"
              sub="Chủ động trao đổi với sinh viên"
            />
            <Stat
              label="Ưu tiên hỗ trợ"
              value={data.counts.RED}
              level="RED"
              sub={`${data.counts.UNKNOWN} hồ sơ chưa đủ đánh giá`}
            />
          </div>
          <div className="chart-grid">
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>Phân bố nguy cơ</h3>
                  <p>Kết hợp mức ưu tiên từ quy tắc và ML</p>
                </div>
                <span className="mini-tag">HIỆN TẠI</span>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.counts).map(([k, v]) => ({
                        name: labels[k],
                        value: v,
                        key: k,
                      }))}
                      dataKey="value"
                      innerRadius={64}
                      outerRadius={91}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {Object.keys(data.counts).map((k) => (
                        <Cell key={k} fill={colors[k]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>Phân bố điểm học kỳ</h3>
                  <p>GPA của các hồ sơ đã đánh giá và còn hiệu lực</p>
                </div>
                <Activity size={20} />
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={data.bins}
                  margin={{ left: -25, top: 20, right: 15 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Sinh viên"
                    fill="#438d7b"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
          <section className="card table-card">
            <div className="card-head">
              <div>
                <h3>Sinh viên cần chú ý</h3>
                <p>Bắt đầu từ những trường hợp có mức ưu tiên cao</p>
              </div>
              <Link className="text-link" to="/students">
                Xem tất cả <ArrowUpRight size={15} />
              </Link>
            </div>
            <StudentTable items={data.students} />
          </section>
        </>
      )}
    </>
  );
}
function Students() {
  const { user } = useContext(Context),
    [q, setQ] = useState(""),
    [classId, setClass] = useState(""),
    [level, setLevel] = useState(""),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false);
  const catalog = useData("/catalog");
  const { data, error, reload } = useData(
    `/students?${new URLSearchParams({ q, classId, priority: level, page: String(page) })}`,
  );
  return (
    <>
      <PageTitle
        eyebrow="HỒ SƠ SINH VIÊN"
        title="Hiểu từng hành trình"
        actions={
          user.role === "ADMIN" && (
            <button className="primary" onClick={() => setCreate(!create)}>
              <Plus size={17} />
              Thêm sinh viên
            </button>
          )
        }
      >
        Tìm kiếm hồ sơ, xem tiến độ và các dấu hiệu học tập.
      </PageTitle>
      {create && catalog.data && (
        <StudentForm
          catalog={catalog.data}
          onSaved={() => {
            setCreate(false);
            reload();
          }}
        />
      )}
      <div className="filters">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm sinh viên"
            placeholder="Tìm tên hoặc mã sinh viên…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Lọc lớp"
          value={classId}
          onChange={(e) => {
            setClass(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả lớp</option>
          {catalog.data?.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc nguy cơ"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả mức nguy cơ</option>
          {Object.entries(labels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <ErrorBox error={error} />
      <section className="card table-card">
        <StudentTable items={data?.items} />
        <div className="pagination">
          <span>
            {data?.total || 0} sinh viên · Trang {page}
          </span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trước
            </button>
            <button
              disabled={!data || page * 10 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
function StudentForm({ student, catalog, onSaved }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.entryOrdinal = Number(d.entryOrdinal);
    d.admissionScore =
      d.admissionScore === "" ? null : Number(d.admissionScore);
    setBusy(true);
    try {
      await api(
        student ? `/students/${student.id}` : "/students",
        student ? "PUT" : "POST",
        d,
      );
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card form-card" onSubmit={submit}>
      <h3>{student ? "Sửa hồ sơ" : "Sinh viên mới"}</h3>
      <div className="form-grid">
        <label>
          MSSV
          <input name="code" required defaultValue={student?.code} />
        </label>
        <label>
          Họ tên
          <input name="name" required defaultValue={student?.name} />
        </label>
        <label>
          Lớp
          <select name="classId" defaultValue={student?.classId}>
            {catalog.classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Học kỳ nhập học
          <select name="entryOrdinal" defaultValue={student?.entryOrdinal || 1}>
            {catalog.terms.map((t) => (
              <option value={t.ordinal} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Điểm xét tuyển (tùy chọn)
          <input
            type="number"
            name="admissionScore"
            min="0"
            max="30"
            step="0.1"
            defaultValue={student?.admissionScore ?? ""}
          />
        </label>
        <label>
          Trạng thái
          <select name="status" defaultValue={student?.status || "ACTIVE"}>
            <option value="ACTIVE">Đang học</option>
            <option value="PAUSED">Tạm hoãn</option>
            <option value="GRADUATED">Đã tốt nghiệp</option>
            <option value="WITHDRAWN">Đã thôi học</option>
          </select>
        </label>
      </div>
      <ErrorBox error={error} />
      <button className="primary" disabled={busy}>
        Lưu hồ sơ
      </button>
    </form>
  );
}
function SemesterEditor({ student, catalog, onSaved }) {
  const [termId, setTerm] = useState(
      [...student.semesters]
        .sort((a, b) => a.term.ordinal - b.term.ordinal)
        .at(-1)?.termId ||
        catalog.terms.find((t) => t.ordinal >= student.entryOrdinal)?.id,
    ),
    [grades, setGrades] = useState({}),
    [finalized, setFinal] = useState(true),
    [paused, setPaused] = useState(false),
    [officialWarning, setWarning] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = student.semesters.find((s) => s.termId === termId);
    setGrades(
      Object.fromEntries(
        (s?.grades || []).map((g) => [g.courseId, g.score ?? ""]),
      ),
    );
    setFinal(s?.finalized ?? true);
    setPaused(s?.paused ?? false);
    setWarning(s?.officialWarning ?? false);
  }, [termId, student]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/students/${student.id}/semester`, "PUT", {
        termId,
        finalized,
        paused,
        officialWarning: paused ? false : officialWarning,
        grades: paused
          ? []
          : Object.entries(grades).map(([courseId, s]) => ({
              courseId,
              score: s === "" ? null : Number(s),
            })),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card form-card" onSubmit={save}>
      <div className="card-head">
        <div>
          <h3>Cập nhật học kỳ</h3>
          <p>
            Lưu sẽ thay bảng điểm kỳ đã chọn. Phiên bản trước được giữ trong
            nhật ký.
          </p>
        </div>
        <select
          aria-label="Học kỳ chỉnh sửa"
          value={termId}
          onChange={(e) => setTerm(e.target.value)}
        >
          {catalog.terms
            .filter((t) => t.ordinal >= student.entryOrdinal)
            .map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </div>
      <div className="checks">
        <label>
          <input
            type="checkbox"
            checked={finalized}
            onChange={(e) => setFinal(e.target.checked)}
          />
          Chốt kết quả
        </label>
        <label>
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          Bảo lưu kỳ này
        </label>
        <label>
          <input
            type="checkbox"
            checked={officialWarning}
            disabled={paused}
            onChange={(e) => setWarning(e.target.checked)}
          />
          Có quyết định cảnh cáo đã nhập (demo)
        </label>
      </div>
      {!paused && (
        <div className="course-grid">
          {catalog.courses.map((c) => (
            <div className="course-row" key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={c.id in grades}
                  onChange={(e) =>
                    setGrades((g) => {
                      const n = { ...g };
                      if (e.target.checked) n[c.id] = "";
                      else delete n[c.id];
                      return n;
                    })
                  }
                />
                <span>
                  {c.code} · {c.name}
                  <small>{c.credits} tín chỉ</small>
                </span>
              </label>
              {c.id in grades && (
                <input
                  aria-label={`Điểm ${c.code}`}
                  placeholder="0–4"
                  type="number"
                  min="0"
                  max="4"
                  step="0.1"
                  value={grades[c.id]}
                  onChange={(e) =>
                    setGrades({ ...grades, [c.id]: e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
      <ErrorBox error={error} />
      <button className="primary" disabled={busy}>
        {busy ? "Đang lưu và đánh giá…" : "Lưu & đánh giá lại"}
      </button>
    </form>
  );
}
function StudentDetail() {
  const { id } = useParams();
  const { data, error, reload } = useData(`/students/${id}`),
    cat = useData("/catalog");
  const { user } = useContext(Context);
  const [edit, setEdit] = useState(false),
    [profile, setProfile] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const assess = async () => {
    setBusy(true);
    setActionError("");
    try {
      await api(`/students/${id}/assess`, "POST");
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <ErrorBox error={error} />;
  const { student, academic, assessment, alerts } = data;
  const a = assessment?.payload,
    ml = a?.ml,
    rule = a?.rule;
  return (
    <>
      <Link to="/students" className="back">
        <ArrowLeft size={16} />
        Danh sách sinh viên
      </Link>
      <PageTitle
        eyebrow={`${student.code} / ${student.advisingClass.name}`}
        title={student.name}
        actions={
          <div className="actions">
            {user.role === "ADMIN" && (
              <>
                <button onClick={() => setProfile(!profile)}>Sửa hồ sơ</button>
                <button onClick={() => setEdit(!edit)}>Nhập điểm</button>
              </>
            )}
            <button className="primary" disabled={busy} onClick={assess}>
              <RefreshCw size={16} />
              {busy ? "Đang đánh giá…" : "Đánh giá lại"}
            </button>
          </div>
        }
      >
        {student.advisingClass.program.name}
      </PageTitle>
      <ErrorBox error={error || actionError} />
      {profile && cat.data && (
        <StudentForm
          student={student}
          catalog={cat.data}
          onSaved={() => {
            setProfile(false);
            reload();
          }}
        />
      )}
      {edit && cat.data && (
        <SemesterEditor
          student={student}
          catalog={cat.data}
          onSaved={() => {
            setEdit(false);
            reload();
          }}
        />
      )}
      <div className="stats">
        <Stat
          label="GPA học kỳ"
          value={fmt(academic.latest?.gpa)}
          sub={academic.latest?.term || "Chưa có học kỳ"}
        />
        <Stat
          label="CPA tích lũy"
          value={fmt(academic.latest?.cpa)}
          sub="Thang điểm 4"
        />
        <Stat
          label="Tín chỉ đã đạt"
          value={academic.latest?.earned ?? "—"}
          sub={`Mốc dự kiến: ${academic.latest?.expected ?? "—"} tín chỉ`}
        />
        <Stat
          label="Tín chỉ còn nợ"
          value={academic.latest?.debtCredits ?? "—"}
          level="YELLOW"
          sub="Mỗi học phần chỉ tính một lần"
        />
      </div>
      {!academic.valid && <div className="notice">{academic.reason}</div>}
      {assessment?.stale && (
        <div className="notice">
          Dữ liệu đã thay đổi. Kết quả dưới đây là bản cũ; cần đánh giá lại.
        </div>
      )}
      <div className="chart-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Tình trạng hiện tại</h3>
              <p>Theo bộ quy tắc demo {a?.policyVersion}</p>
            </div>
            <Badge level={rule?.level} />
          </div>
          {rule?.reasons?.length ? (
            <ul className="reason-list">
              {rule.reasons.map((r) => (
                <li key={r.code}>
                  <span
                    className="dot"
                    style={{ background: colors[r.level] }}
                  />
                  {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {academic.valid
                ? "Chưa phát hiện dấu hiệu theo quy tắc demo."
                : "Chưa đủ dữ liệu để kiểm tra."}
            </p>
          )}
          <div className="divider" />
          <h4>Gợi ý tư vấn</h4>
          <ul className="bullets">
            {rule?.recommendations?.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <small>Không phải quyết định cảnh cáo của nhà trường.</small>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Dự báo học kỳ tiếp theo</h3>
              <p>
                {assessment?.targetOrdinal
                  ? `Mục tiêu: học kỳ ${assessment.targetOrdinal}`
                  : "Chưa xác định kỳ mục tiêu"}
              </p>
            </div>
            <BrainCircuit size={22} />
          </div>
          {ml?.status === "OK" ? (
            <>
              <div className="risk-score">
                <strong>
                  {Math.round(ml.probability * 100)}
                  <span>%</span>
                </strong>
                <Badge level={ml.level} />
              </div>
              <p>Điểm nguy cơ từ mô hình huấn luyện trên dữ liệu giả lập.</p>
              <div className="sensitivity">
                {ml.explanation.slice(0, 4).map((x) => (
                  <div key={x.feature}>
                    <span>{x.label}</span>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${Math.min(100, Math.abs(x.delta) * 400)}%`,
                          background: x.delta >= 0 ? "#ca625b" : "#21816c",
                        }}
                      />
                    </div>
                    <b>
                      {x.delta >= 0 ? "+" : ""}
                      {(x.delta * 100).toFixed(1)} đ%
                    </b>
                  </div>
                ))}
              </div>
              <small>{ml.explanationMethod}</small>
            </>
          ) : (
            <div className="empty">
              {ml?.message ||
                "Chưa chạy dự báo. Bấm Đánh giá lại khi dữ liệu đã đủ."}
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Hành trình học tập</h3>
            <p>GPA và CPA qua các học kỳ đã chốt</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={academic.history} margin={{ left: -20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="term" />
            <YAxis domain={[0, 4]} />
            <Tooltip />
            <Legend />
            <Line
              connectNulls={false}
              type="monotone"
              dataKey="gpa"
              name="GPA"
              stroke="#21816c"
              strokeWidth={3}
            />
            <Line
              connectNulls={false}
              type="monotone"
              dataKey="cpa"
              name="CPA"
              stroke="#c49b55"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Tiến độ tích lũy tín chỉ</h3>
            <p>
              So sánh tín chỉ đã đạt với tiến độ dự kiến của chương trình đào tạo.
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={academic.history} margin={{ left: -15, right: 15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="term" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="expected"
              name="Mốc dự kiến"
              fill="#d6dfd9"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="earned"
              name="Tín chỉ đã đạt"
              fill="#21816c"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="card">
        <h3>Bảng điểm theo kỳ</h3>
        <p className="muted">{cat.data?.policy.cpaRule}</p>
        {[...student.semesters]
          .sort((a, b) => a.term.ordinal - b.term.ordinal)
          .map((s) => (
            <details key={s.id}>
              <summary>
                {s.term.name} ·{" "}
                {s.paused ? "Bảo lưu" : s.finalized ? "Đã chốt" : "Bản nháp"}{" "}
                {s.officialWarning ? "· Có cảnh cáo đã nhập" : ""}
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Học phần</th>
                    <th>Tín chỉ</th>
                    <th>Điểm / 4</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {s.grades.map((g) => (
                    <tr key={g.id}>
                      <td>
                        {g.course.code} · {g.course.name}
                      </td>
                      <td>{g.course.credits}</td>
                      <td>{fmt(g.score)}</td>
                      <td>
                        {g.score == null
                          ? "Chưa có điểm"
                          : g.score >= 1
                            ? "Đạt"
                            : "Chưa đạt"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
      </section>
      <section className="card">
        <h3>Môn cần trả nợ</h3>
        {academic.debts.length ? (
          <ul className="bullets">
            {academic.debts.map((c) => (
              <li key={c.id}>
                <b>
                  {c.code} · {c.name}
                </b>{" "}
                — {c.credits} TC, {c.failures} lần không đạt
                {c.blocks.length ? `; ảnh hưởng: ${c.blocks.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Chưa ghi nhận học phần còn nợ trong dữ liệu đã chốt.
          </p>
        )}
      </section>
      <section className="card">
        <h3>Theo dõi tư vấn</h3>
        {alerts.length ? (
          alerts.map((al) => (
            <AlertItem key={al.id} alert={al} reload={reload} compact />
          ))
        ) : (
          <p className="muted">Chưa có cảnh báo cần xử lý.</p>
        )}
      </section>
      <section className="card">
        <h3>Lịch sử đánh giá</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Kỳ mục tiêu</th>
                <th>Ưu tiên</th>
                <th>ML</th>
                <th>Phiên bản dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((h) => (
                <tr key={h.id}>
                  <td>{when(h.createdAt)}</td>
                  <td>{h.targetOrdinal ?? "—"}</td>
                  <td>
                    <Badge level={h.priority} />
                  </td>
                  <td>{h.mlStatus}</td>
                  <td>{h.revision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function AlertItem({ alert, reload, compact = false }) {
  const [body, setBody] = useState(""),
    [workflow, setWorkflow] = useState(alert.workflow),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => setWorkflow(alert.workflow), [alert.workflow]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/alerts/${alert.id}/notes`, "POST", { body, workflow });
      setBody("");
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="alert-item">
      <div className="alert-head">
        <div>
          {!compact && (
            <Link to={`/students/${alert.studentId}`}>
              <b>{alert.student.name}</b>{" "}
              <span className="muted">
                {alert.student.code} · {alert.student.advisingClass.name}
              </span>
            </Link>
          )}
          <p>
            Học kỳ {alert.termOrdinal} · {workflows[alert.workflow]} ·{" "}
            {alert.active
              ? "Dấu hiệu còn ghi nhận"
              : "Dấu hiệu đã hết ở lần đánh giá kỳ này"}
          </p>
        </div>
        <Badge level={alert.severity} />
      </div>
      <form onSubmit={save} className="note-form">
        <textarea
          aria-label="Nội dung tư vấn"
          placeholder="Ghi nội dung trao đổi, kế hoạch hỗ trợ và thời điểm theo dõi…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={3}
          maxLength={2000}
          required
        />
        <div>
          <select
            aria-label="Trạng thái xử lý"
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
          >
            {Object.entries(workflows).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="primary" disabled={busy}>
            Lưu tư vấn
          </button>
        </div>
        <ErrorBox error={error} />
      </form>
      {alert.notes.map((n) => (
        <div className="note" key={n.id}>
          <p>{n.body}</p>
          <small>
            {n.author.name} · {when(n.createdAt)} · {workflows[n.workflow]}
          </small>
        </div>
      ))}
    </div>
  );
}
function Alerts() {
  const [workflow, setWorkflow] = useState(""),
    [severity, setSeverity] = useState(""),
    [q, setQ] = useState("");
  const { data, error, reload } = useData(
    `/alerts?${new URLSearchParams({ workflow, severity, q })}`,
  );
  return (
    <>
      <PageTitle
        eyebrow="TRUNG TÂM CẢNH BÁO"
        title="Biến dấu hiệu thành hành động"
      >
        Theo dõi lịch sử cảnh báo và ghi nhận từng lần hỗ trợ. Đã tư vấn không
        đồng nghĩa đã hết nguy cơ.
      </PageTitle>
      <div className="filters">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm cảnh báo"
            placeholder="Tìm tên, mã sinh viên hoặc lớp…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Lọc trạng thái"
          value={workflow}
          onChange={(e) => setWorkflow(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(workflows).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc mức cảnh báo"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">Tất cả mức độ</option>
          <option value="RED">Ưu tiên hỗ trợ</option>
          <option value="YELLOW">Cần theo dõi</option>
        </select>
      </div>
      <ErrorBox error={error} />
      <section className="card">
        {data?.map((a) => (
          <AlertItem key={a.id} alert={a} reload={reload} />
        ))}
        {data && !data.length && (
          <div className="empty">Không có cảnh báo phù hợp.</div>
        )}
      </section>
    </>
  );
}
function Model() {
  const { data, error } = useData("/model");
  return (
    <>
      <PageTitle eyebrow="MINH BẠCH MÔ HÌNH" title="Dự báo có căn cứ">
        Xem thuật toán, cách kiểm thử và phạm vi sử dụng của mô hình.
      </PageTitle>
      <ErrorBox error={error} />
      {data && (
        <>
         <div className="notice">
  Mô hình hiện được đánh giá trên dữ liệu mô phỏng.
  Kết quả dùng để tham khảo khi tư vấn.
</div>
          <div className="stats">
            <Stat
              label="Thuật toán"
              value={data.algorithm}
              sub="Chọn trên tập selection"
            />
            <Stat
              label="Recall · ngưỡng Vàng"
              value={`${(data.testAtYellow.recall * 100).toFixed(1)}%`}
              sub="Tập test giả lập"
            />
            <Stat
              label="Precision · ngưỡng Đỏ"
              value={`${(data.test.precision * 100).toFixed(1)}%`}
              sub="Tập test giả lập"
            />
            <Stat
              label="Average precision"
              value={fmt(data.test.average_precision)}
              sub="Không phải độ chính xác thực tế"
            />
          </div>
          <section className="card">
            <h3>Cấu hình dự báo</h3>
            <p>{data.target}</p>
            <p>
              Ngưỡng Vàng: {data.thresholds.yellow} · Ngưỡng Đỏ:{" "}
              {data.thresholds.red}
            </p>
            <p className="muted">
              Phiên bản: {data.modelVersion} · Bộ quy tắc: {data.policyVersion}
            </p>
            <h4>Chia dữ liệu theo thời gian và sinh viên</h4>
            <table>
              <thead>
                <tr>
                  <th>Tập</th>
                  <th>Sinh viên giả lập</th>
                  <th>Số mẫu</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.splitCounts).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{v.students}</td>
                    <td>{v.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">
              Tập test không tham gia chọn mô hình, hiệu chỉnh hoặc chọn ngưỡng.
              Các chỉ số chỉ có giá trị trên dữ liệu giả lập.
            </p>
          </section>
        </>
      )}
    </>
  );
}
function AdminForm({ title, path, fields, onSaved }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const form = e.target,
      d = Object.fromEntries(new FormData(form));
    for (const f of fields) {
      if (f.type === "number") d[f.name] = Number(d[f.name]);
      if (f.nullable && d[f.name] === "") d[f.name] = null;
    }
    setBusy(true);
    try {
      await api(path, "POST", d);
      form.reset();
      onSaved();
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card form-card" onSubmit={submit}>
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.options ? (
            <select name={f.name} required={!f.nullable}>
              {f.nullable && <option value="">Không có</option>}
              {f.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type || "text"}
              name={f.name}
              required
              min={f.type === "number" ? 1 : undefined}
              minLength={f.type === "password" ? 10 : undefined}
            />
          )}
        </label>
      ))}
      <ErrorBox error={error} />
      <button disabled={busy} className="primary">
        Thêm mới
      </button>
    </form>
  );
}
function Admin() {
  const { data, error, reload } = useData("/catalog");
  const [actionError, setActionError] = useState("");
  const { setToast } = useContext(Context);
  const saved = () => {
    reload();
    setToast("Đã lưu dữ liệu");
  };
  return (
    <>
      <PageTitle eyebrow="QUẢN TRỊ" title="Thiết lập không gian học tập">
        Quản lý dữ liệu nền, tài khoản cố vấn và phân công lớp.
      </PageTitle>
      <ErrorBox error={error || actionError} />
      {data && (
        <>
          <section className="card">
            <h3>Phân công cố vấn</h3>
            <table>
              <thead>
                <tr>
                  <th>Lớp</th>
                  <th>Chương trình</th>
                  <th>CVHT phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {data.classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.program.name}</td>
                    <td>
                      <select
                        aria-label={`Cố vấn lớp ${c.name}`}
                        value={c.advisorId}
                        onChange={async (e) => {
                          try {
                            await api(`/admin/classes/${c.id}`, "PATCH", {
                              advisorId: e.target.value,
                            });
                            saved();
                          } catch (e) {
                            setActionError(e.message);
                          }
                        }}
                      >
                        {data.advisors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="admin-grid">
            <AdminForm
              title="Tài khoản CVHT"
              path="/admin/users"
              onSaved={saved}
              fields={[
                { name: "name", label: "Họ tên" },
                { name: "email", label: "Email", type: "email" },
                {
                  name: "password",
                  label: "Mật khẩu (ít nhất 10 ký tự)",
                  type: "password",
                },
              ]}
            />
            <AdminForm
              title="Lớp mới"
              path="/admin/classes"
              onSaved={saved}
              fields={[
                { name: "name", label: "Tên lớp" },
                {
                  name: "programId",
                  label: "Chương trình",
                  options: data.programs,
                },
                { name: "advisorId", label: "CVHT", options: data.advisors },
              ]}
            />
            <AdminForm
              title="Học kỳ mới"
              path="/admin/terms"
              onSaved={saved}
              fields={[
                { name: "name", label: "Tên học kỳ" },
                {
                  name: "ordinal",
                  label: "Thứ tự kỳ trong lịch đào tạo",
                  type: "number",
                },
              ]}
            />
            <AdminForm
              title="Chương trình mới"
              path="/admin/programs"
              onSaved={saved}
              fields={[
                { name: "name", label: "Tên chương trình" },
                { name: "totalCredits", label: "Tổng tín chỉ", type: "number" },
                {
                  name: "creditsPerTerm",
                  label: "Mốc tín chỉ mỗi kỳ (demo tuyến tính)",
                  type: "number",
                },
              ]}
            />
            <AdminForm
              title="Học phần mới"
              path="/admin/courses"
              onSaved={saved}
              fields={[
                { name: "code", label: "Mã học phần" },
                { name: "name", label: "Tên học phần" },
                { name: "credits", label: "Số tín chỉ", type: "number" },
                {
                  name: "prerequisiteId",
                  label: "Học phần tiên quyết",
                  options: data.courses,
                  nullable: true,
                },
              ]}
            />
          </div>
        </>
      )}
    </>
  );
}
