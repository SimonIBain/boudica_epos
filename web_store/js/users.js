/** This holds your user details while they are active in teh shop.
 * The site does not use cookies and everything is handled within the 
 * local storage or within the PGBC data store
 */


import localStore from './storage.js';

const User = () => {
    const Storage = localStore();
    const FirstName = (first_name) => {
        if ( first_name ) {
            Storage.setItem('first_name', first_name);
        } else {
            return Storage.getItem('first_name');
        }
    };

    const LastName = (last_name) => {
        if ( last_name ) {
            Storage.setItem('last_name', last_name);
        } else {
            return Storage.getItem('last_name');
        }
    };

    const Email = (email) => {
        if ( email ) {
            Storage.setItem('email', email);
        } else {
            return Storage.getItem('email');
        }
    };

    const Phone = (phone) => {
        if ( phone ) {
            Storage.setItem('phone', phone);
        } else {
            return Storage.getItem('phone');
        }
    };

    const Username = (Username) => {
        if ( Username ) {
            Storage.setItem('Username', Username);
        } else {
            return Storage.getItem('Username');
        }
    }; 
    
    const Password = (Password) => {
        if ( Password ) {
            Storage.setItem('Password', Password);
        } else {
            return Storage.getItem('Password');
        }
    };     

    const Address = (address) => {
        if ( address ) {
            Storage.setItem('address', address);
        } else {
            return Storage.getItem('address');
        }
    };

    const ChangePassword (old_password, new_password) => {

    };

    const RegisterUser = (email, first_name, last_name, address, phone) => {
        if ( email && first_name && last_name && address && phone ) {
            Storage.setItem('email', email);
            Storage.setItem('first_name', first_name);
            Storage.setItem('last_name', last_name);
            Storage.setItem('address', address);
            Storage.setItem('phone', phone);
            return true;
        } else {
            return false;
        }
    };

    return {
        FirstName,
        LastName,
        Email,
        Phone,
        Username,
        Password,
        Address,
        RegisterUser
    };    
};

export default User;