import React from 'react';
import Image from 'next/image';

const Footer = () => {
    return (
        <div className='flex items-center justify-center gap-2 mt-5 print:hidden'>
            <p className='text-gray-600 dark:text-gray-400'>Made by</p>
            <a 
                href="https://ghidas.com/" 
                target='_blank' 
                rel='noopener noreferrer' 
                className='transition-opacity hover:opacity-80'
            >
                <Image 
                    src="/logo.png" 
                    alt="GHIDAS Logo" 
                    width={100} 
                    height={40}
                    className='object-contain'
                />
            </a>
        </div>
    );
};

export default Footer;