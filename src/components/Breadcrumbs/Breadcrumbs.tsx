import { Link } from 'react-router-dom';
import s from './Breadcrumbs.module.css';

export interface Crumb {
    label: string;
    url?: string;
}

interface Props {
    crumbs: Crumb[];
    variant?: 'default' | 'catalog';
}

export const Breadcrumbs: React.FC<Props> = ({ crumbs, variant = 'default' }) => {
    return (
        <nav className={`${s.breadcrumbs} ${s[variant]}`}>
            {crumbs.map((crumb, index) => (
                <span key={index} className={s.crumb}>
                    {crumb.url ? (
                        <Link to={crumb.url}>{crumb.label}</Link>
                    ) : (
                        <span className={s.current}>{crumb.label}</span>
                    )}
                    {index < crumbs.length - 1 && (
                        <span className={s.separator}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4" fill="none">
                                <circle cx="2" cy="2" r="2" fill="#0C1618" />
                            </svg>
                        </span>
                    )}
                </span>
            ))}
        </nav>
    );
};
