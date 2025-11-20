import React from 'react';

const InformationPanel = ({node, visible}) => {
    if (!node || !visible) return null;

    return (
        <div className='information-panel'>
            {'Test'}
        </div>
    );
};

export default InformationPanel;