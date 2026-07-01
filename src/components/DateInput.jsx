import React from 'react';

export default function DateInput({ value, onChange, className, required, title, max, type = "date" }) {
    const formatDateForDisplay = (val) => {
        if (!val) return '';
        try {
            if (type === 'datetime-local') {
                const [datePart, timePart] = val.split('T');
                const parts = datePart.split('-');
                if(parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]} ${timePart || ''}`; // DD/MM/YYYY HH:MM
                }
            } else {
                const dateStr = val.includes('T') ? val.split('T')[0] : val;
                const parts = dateStr.split('-');
                if(parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
                }
            }
        } catch(e) {}
        return val;
    };

    return (
        <div className="relative inline-block w-full" title={title}>
            <input 
                type="text" 
                className={`${className} pointer-events-none relative z-10 w-full`} 
                value={formatDateForDisplay(value)} 
                readOnly 
                placeholder={type === 'datetime-local' ? "DD/MM/YYYY HH:MM" : "DD/MM/YYYY"} 
                required={required}
            />
            <input 
                type={type} 
                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20`} 
                value={type === 'date' ? (value ? (value.includes('T') ? value.split('T')[0] : value) : '') : (value || '')} 
                onChange={onChange} 
                required={required}
                max={max}
                style={{
                  color: 'transparent',
                  background: 'transparent'
                }}
            />
        </div>
    );
}
