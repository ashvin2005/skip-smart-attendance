import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../lib/api';
import { Plus } from 'lucide-react';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [view, setView] = useState('month');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [showSubjectForm, setShowSubjectForm] = useState(false);
    const [showSemesterForm, setShowSemesterForm] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    // Form States
    const [newSemester, setNewSemester] = useState({ name: '', startDate: '', endDate: '' });
    const [newSubject, setNewSubject] = useState({
        name: '', code: '', color: '#4F46E5',
        schedule: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }]
    });

    // Exception Handling States
    const [subjects, setSubjects] = useState([]);
    const [showAddSessionModal, setShowAddSessionModal] = useState(false);
    const [newSession, setNewSession] = useState({ subjectId: '', date: '', startTime: '', endTime: '' });

    const [stats, setStats] = useState([]);

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchSubjects(selectedSemester);
            fetchStats(selectedSemester);
        }
    }, [selectedSemester]);

    const fetchSemesters = async () => {
        try {
            const res = await api.get('/semesters');
            setSemesters(res.data);
            if (res.data.length > 0) {
                if (!selectedSemester) {
                    setSelectedSemester(res.data[0].id);
                }
            } else {
                // No semesters found, show onboarding
                setShowSemesterForm(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStats = async (semesterId) => {
        try {
            const res = await api.get(`/attendance/stats/${semesterId}`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchSubjects = async (semesterId) => {
        try {
            const res = await api.get(`/semesters/${semesterId}/subjects`);
            setSubjects(res.data);
            // Convert sessions to calendar events
            const calendarEvents = [];
            res.data.forEach((subject) => {
                subject.sessions.forEach((session) => {
                    calendarEvents.push({
                        id: session.id,
                        subjectId: subject.id, // Added subjectId for stats lookup
                        title: subject.name,
                        code: subject.code, // Add code
                        start: new Date(session.startTime),
                        end: new Date(session.endTime),
                        resource: { status: session.status },
                        style: { backgroundColor: subject.color }
                    });
                });
            });
            setEvents(calendarEvents);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateSemester = async (e) => {
        e.preventDefault();
        try {
            await api.post('/semesters', newSemester);
            setShowSemesterForm(false);
            fetchSemesters();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/semesters/subjects', { ...newSubject, semesterId: selectedSemester });
            setShowSubjectForm(false);
            // Reset form
            setNewSubject({
                name: '', code: '', color: '#4F46E5',
                schedule: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }]
            });
            fetchSubjects(selectedSemester);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setShowAttendanceModal(true);
    };

    const handleMarkAttendance = async (status) => {
        if (!selectedEvent) return;
        try {
            await api.post('/attendance/mark', { sessionId: selectedEvent.id, status });
            // Don't close modal immediately, just refresh data
            // setShowAttendanceModal(false); 
            fetchSubjects(selectedSemester);
            fetchStats(selectedSemester); // Refresh stats to update the card
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteSession = async () => {
        if (!selectedEvent) return;
        if (!confirm('Are you sure you want to delete this session?')) return;
        try {
            await api.delete(`/attendance/session/${selectedEvent.id}`);
            setShowAttendanceModal(false);
            fetchSubjects(selectedSemester);
            fetchStats(selectedSemester);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectSlot = (slotInfo) => {
        const dateStr = format(slotInfo.start, 'yyyy-MM-dd');
        const startTimeStr = format(slotInfo.start, 'HH:mm');
        const endTimeStr = format(slotInfo.end, 'HH:mm');

        setNewSession({
            subjectId: subjects.length > 0 ? subjects[0].id : '',
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr
        });
        setShowAddSessionModal(true);
    };

    const handleAddSession = async (e) => {
        e.preventDefault();
        try {
            // Combine date and time
            const dateStr = newSession.date; // YYYY-MM-DD
            const startDateTime = `${dateStr}T${newSession.startTime}:00`;
            const endDateTime = `${dateStr}T${newSession.endTime}:00`;

            await api.post('/attendance/session', {
                subjectId: newSession.subjectId,
                date: dateStr,
                startTime: startDateTime,
                endTime: endDateTime
            });
            setShowAddSessionModal(false);
            fetchSubjects(selectedSemester);
            fetchStats(selectedSemester);
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkPastSkipped = async () => {
        if (!confirm('This will mark ALL past pending classes as SKIPPED. Are you sure?')) return;
        try {
            const res = await api.post('/attendance/mark-past', { semesterId: selectedSemester });
            alert(`Marked ${res.data.count} sessions as skipped.`);
            fetchSubjects(selectedSemester);
            fetchStats(selectedSemester);
        } catch (error) {
            console.error(error);
        }
    };

    const CustomToolbar = (toolbar) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToCurrent = () => {
            toolbar.onNavigate('TODAY');
        };

        const label = () => {
            return (
                <span className="text-lg font-bold text-gray-900">
                    {format(toolbar.date, 'MMMM yyyy')}
                </span>
            );
        };

        return (
            <div className="calendar-toolbar">
                <div className="toolbar-group">
                    <h2 className="toolbar-title">{format(toolbar.date, 'MMMM yyyy')}</h2>
                    <div className="nav-buttons">
                        <button onClick={goToBack} className="nav-btn">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={goToCurrent} className="nav-btn today-btn">Today</button>
                        <button onClick={goToNext} className="nav-btn">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                <div className="view-switcher">
                    {['month', 'week', 'day'].map(v => (
                        <button
                            key={v}
                            onClick={() => toolbar.onView(v)}
                            className={`view-btn ${toolbar.view === v ? 'active' : ''}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <div className="semester-controls">
                    <select
                        className="semester-select"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                        {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                        onClick={() => setShowSemesterForm(true)}
                        className="action-btn"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Semester
                    </button>
                    <button
                        onClick={() => setShowSubjectForm(true)}
                        className="action-btn primary"
                        disabled={!selectedSemester}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Subject
                    </button>
                    <button
                        onClick={handleMarkPastSkipped}
                        className="action-btn"
                        style={{ borderColor: '#B91C1C', color: '#B91C1C', backgroundColor: '#FEE2E2' }}
                        title="Mark all past pending classes as skipped"
                    >
                        Auto-Skip
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div className="calendar-container">
            {/* Modals (Simplified as inline forms for brevity) */}
            {showSemesterForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">Create Semester</h3>
                            <button onClick={() => setShowSemesterForm(false)} className="close-btn">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateSemester}>
                            <div className="form-group">
                                <label className="form-label">Semester Name</label>
                                <input placeholder="e.g. Fall 2023" className="form-input" value={newSemester.name} onChange={e => setNewSemester({ ...newSemester, name: e.target.value })} required />
                            </div>
                            <div className="flex gap-4 form-group">
                                <div className="flex-1">
                                    <label className="form-label">Start Date</label>
                                    <input type="date" className="form-input" value={newSemester.startDate} onChange={e => setNewSemester({ ...newSemester, startDate: e.target.value })} required />
                                </div>
                                <div className="flex-1">
                                    <label className="form-label">End Date</label>
                                    <input type="date" className="form-input" value={newSemester.endDate} onChange={e => setNewSemester({ ...newSemester, endDate: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowSemesterForm(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Create Semester</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSubjectForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '32rem' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Subject</h3>
                            <button onClick={() => setShowSubjectForm(false)} className="close-btn">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubject}>
                            <div className="flex gap-4 form-group">
                                <div className="flex-1">
                                    <label className="form-label">Subject Name</label>
                                    <input placeholder="e.g. Mathematics" className="form-input" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} required />
                                </div>
                                <div className="flex-1">
                                    <label className="form-label">Code</label>
                                    <input placeholder="e.g. CS101" className="form-input" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group" style={{ backgroundColor: 'var(--color-gray-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                                <div className="flex justify-between items-center mb-3">
                                    <p className="form-label mb-0">Weekly Schedule</p>
                                    <button type="button" onClick={() => {
                                        setNewSubject({
                                            ...newSubject,
                                            schedule: [...newSubject.schedule, { day: 'Monday', startTime: '10:00', endTime: '11:00' }]
                                        });
                                    }} className="text-sm text-primary font-medium hover:text-indigo-700 flex items-center">
                                        <Plus className="w-3 h-3 mr-1" /> Add Day
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {newSubject.schedule.map((sch, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <select className="form-input" style={{ flex: 1 }} value={sch.day} onChange={e => {
                                                const newSch = [...newSubject.schedule];
                                                newSch[index].day = e.target.value;
                                                setNewSubject({ ...newSubject, schedule: newSch });
                                            }}>
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <input type="time" className="form-input" style={{ width: 'auto' }} value={sch.startTime} onChange={e => {
                                                const newSch = [...newSubject.schedule];
                                                newSch[index].startTime = e.target.value;
                                                setNewSubject({ ...newSubject, schedule: newSch });
                                            }} />
                                            <span>-</span>
                                            <input type="time" className="form-input" style={{ width: 'auto' }} value={sch.endTime} onChange={e => {
                                                const newSch = [...newSubject.schedule];
                                                newSch[index].endTime = e.target.value;
                                                setNewSubject({ ...newSubject, schedule: newSch });
                                            }} />
                                            {newSubject.schedule.length > 1 && (
                                                <button type="button" onClick={() => {
                                                    const newSch = newSubject.schedule.filter((_, i) => i !== index);
                                                    setNewSubject({ ...newSubject, schedule: newSch });
                                                }} className="text-red-500 hover:text-red-700 p-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowSubjectForm(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Add Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddSessionModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">Add Extra Class</h3>
                            <button onClick={() => setShowAddSessionModal(false)} className="close-btn">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddSession}>
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <select className="form-input" value={newSession.subjectId} onChange={e => setNewSession({ ...newSession, subjectId: e.target.value })} required>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input type="date" className="form-input" value={newSession.date} onChange={e => setNewSession({ ...newSession, date: e.target.value })} required />
                            </div>
                            <div className="flex gap-4 form-group">
                                <div className="flex-1">
                                    <label className="form-label">Start Time</label>
                                    <input type="time" className="form-input" value={newSession.startTime} onChange={e => setNewSession({ ...newSession, startTime: e.target.value })} required />
                                </div>
                                <div className="flex-1">
                                    <label className="form-label">End Time</label>
                                    <input type="time" className="form-input" value={newSession.endTime} onChange={e => setNewSession({ ...newSession, endTime: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowAddSessionModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Add Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAttendanceModal && selectedEvent && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">
                                    {selectedEvent.title}
                                    {selectedEvent.code && <span className="text-gray-500 text-sm ml-2 font-normal">({selectedEvent.code})</span>}
                                </h3>
                                <p style={{ color: 'var(--color-pencil)', fontSize: '0.875rem' }}>
                                    {format(selectedEvent.start, 'EEEE, MMMM d')} • {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                                </p>
                            </div>
                            <button onClick={() => setShowAttendanceModal(false)} className="close-btn">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Stats Preview */}
                            {(() => {
                                const subjectStat = stats.find(s => s.subjectId === selectedEvent.subjectId);
                                if (subjectStat) {
                                    return (
                                        <div className="stat-card" style={{ padding: '1rem', transform: 'none' }}>
                                            <div className="stat-header" style={{ marginBottom: '0.5rem' }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">Target: {subjectStat.targetPercentage}%</span>
                                                </div>
                                                <div className={`stat-badge ${subjectStat.status.toLowerCase()}`}>
                                                    {subjectStat.status}
                                                </div>
                                            </div>
                                            <div className="score-row">
                                                <span>Attendance</span>
                                                <span style={{ fontWeight: 700 }}>{subjectStat.currentPercentage}%</span>
                                            </div>
                                            <div className="progress-bar-container" style={{ height: '0.5rem' }}>
                                                <div className="progress-bar-fill" style={{ width: `${Math.min(100, subjectStat.currentPercentage)}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div>
                                <p className="form-label">Mark Attendance</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleMarkAttendance('ATTENDED')} className="btn-secondary" style={{ flex: 1, borderColor: 'var(--color-green-700)', color: 'var(--color-green-700)', backgroundColor: 'var(--color-green-50)' }}>
                                        Attended
                                    </button>
                                    <button onClick={() => handleMarkAttendance('SKIPPED')} className="btn-secondary" style={{ flex: 1, borderColor: 'var(--color-red-700)', color: 'var(--color-red-700)', backgroundColor: 'var(--color-red-50)' }}>
                                        Skipped
                                    </button>
                                    <button onClick={() => handleMarkAttendance('CANCELLED')} className="btn-secondary" style={{ flex: 1, borderColor: 'var(--color-gray-300)', color: 'var(--color-pencil)' }}>
                                        Cancelled
                                    </button>
                                </div>
                                <button onClick={handleDeleteSession} className="btn-secondary" style={{ width: '100%', marginTop: '1rem', borderColor: '#B91C1C', color: '#B91C1C', backgroundColor: '#FEE2E2' }}>
                                    Delete Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {events.length === 0 && semesters.length > 0 && (
                <div style={{ backgroundColor: 'var(--color-white)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-gray-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="text-lg font-bold">No Classes Scheduled</h3>
                        <p style={{ color: 'var(--color-pencil)' }}>Add subjects to populate your calendar.</p>
                    </div>
                    <button onClick={() => setShowSubjectForm(true)} className="btn-primary">
                        Add Subject
                    </button>
                </div>
            )}

            <div className="calendar-wrapper">
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    view={view}
                    onView={setView}
                    style={{ height: '100%' }}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    components={{
                        toolbar: CustomToolbar
                    }}
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: event.resource.status === 'ATTENDED' ? '#00C853' : // Green
                                event.resource.status === 'SKIPPED' ? '#D32F2F' : // Red
                                    event.resource.status === 'CANCELLED' ? '#9E9E9E' : // Grey
                                        event.style.backgroundColor,
                            borderRadius: '4px',
                            border: 'none',
                            boxShadow: 'none',
                            padding: '2px 6px',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                        }
                    })}
                />
            </div>
        </div>
    );
};

export default CalendarPage;
