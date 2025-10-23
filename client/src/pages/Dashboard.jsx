import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchStats(selectedSemester);
        }
    }, [selectedSemester]);

    const fetchSemesters = async () => {
        try {
            const res = await api.get('/semesters');
            setSemesters(res.data);
            if (res.data.length > 0) {
                setSelectedSemester(res.data[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            setLoading(false);
        }
    };

    const fetchStats = async (semesterId) => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance/stats/${semesterId}`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && semesters.length === 0) return <div>Loading...</div>;

    if (semesters.length === 0) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Welcome to SkipSmart!</h2>
                <p className="text-gray-500 mb-8">You haven't set up any semesters yet.</p>
                <Link
                    to="/calendar"
                    className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition inline-flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Semester
                </Link>
            </div>
        );
    }

    if (!loading && stats.length === 0) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
                        <p className="text-gray-500 mt-1 text-sm">Overview of your academic performance</p>
                    </div>
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium cursor-pointer hover:bg-gray-50 transition-colors text-sm"
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                        >
                            {semesters.map((sem) => (
                                <option key={sem.id} value={sem.id}>
                                    {sem.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>
                <div className="text-center py-16 bg-white rounded-md shadow-sm border border-gray-200">
                    <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Subjects Added</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">Add subjects to this semester to start tracking your attendance and get smart skip suggestions.</p>
                    <Link
                        to="/calendar"
                        className="bg-primary text-white px-6 py-2.5 rounded-md hover:bg-green-600 transition inline-flex items-center font-medium shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Your First Subject
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="header-title">
                        Dashboard
                        <span className="header-underline"></span>
                    </h1>
                    <p className="header-subtitle">Overview of your academic performance</p>
                </div>
                <div className="semester-select-wrapper">
                    <select
                        className="semester-select"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                        {semesters.map((sem) => (
                            <option key={sem.id} value={sem.id}>
                                {sem.name}
                            </option>
                        ))}
                    </select>
                    <div className="select-arrow">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {stats.map((subject) => (
                    <div key={subject.subjectId} className="stat-card">
                        <div className="stat-header">
                            <div>
                                <h3 className="stat-title">{subject.subjectName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target</span>
                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{subject.targetPercentage}%</span>
                                </div>
                            </div>
                            <div className={`stat-badge ${subject.status.toLowerCase()}`}>
                                {subject.status}
                            </div>
                        </div>

                        <div className="stat-body">
                            <div>
                                <div className="score-row">
                                    <span className="text-sm font-medium text-gray-500">Attendance</span>
                                    <span className={`text-xl font-bold ${subject.currentPercentage >= subject.targetPercentage ? 'text-gray-900' : 'text-red-600'}`}>
                                        {subject.currentPercentage}%
                                    </span>
                                </div>
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${Math.min(100, subject.currentPercentage)}%` }}
                                    >
                                        <div className="progress-pattern"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="stat-details">
                                <div>
                                    <p>Attended: <strong>{subject.attendedClasses}</strong></p>
                                </div>
                                <div>
                                    <p>Total: <strong>{subject.totalClasses}</strong></p>
                                </div>
                            </div>

                            <div className="pt-2">
                                {subject.isImpossible ? (
                                    <div className="stat-message" style={{ color: 'var(--color-red-700)', backgroundColor: 'var(--color-red-50)' }}>
                                        <XCircle className="w-5 h-5 flex-shrink-0" />
                                        <div>
                                            <p>Target unreachable</p>
                                        </div>
                                    </div>
                                ) : subject.mustAttend === 0 ? (
                                    <div className="stat-message" style={{ color: 'var(--color-green-700)', backgroundColor: 'var(--color-green-50)' }}>
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                        <span>Skip <strong>{subject.canSkip}</strong> classes.</span>
                                    </div>
                                ) : (
                                    <div className="stat-message" style={{ color: 'var(--color-amber-700)', backgroundColor: 'var(--color-amber-50)' }}>
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <span>Attend <strong>{subject.mustAttend}</strong> classes!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
