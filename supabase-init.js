// Initialize Supabase
const SUPABASE_URL = 'https://gltwnphdnookarygstmn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z_ZlMaOygUZ5hxlqEa1ZTA_LrfQm3Wt';

// Check if Supabase SDK is loaded
if (typeof supabase === 'undefined') {
    console.error('Supabase SDK not loaded! Make sure to include the CDN script.');
} else {
    const { createClient } = supabase;
    window.sbClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    window.sbHelpers = {
        async loginUser(phone, pass) {
            try {
                const { data, error } = await window.sbClient
                    .from('users')
                    .select('*')
                    .eq('phone', phone)
                    .eq('pass', pass)
                    .maybeSingle(); // Use maybeSingle to avoid 406 on zero rows if not using single correctly with rows

                if (error) {
                    console.error('Supabase Login Error:', error);
                    return null;
                }
                return data;
            } catch (err) {
                console.error('Unexpected Login Error:', err);
                return null;
            }
        },

        async getAllUsers() {
            try {
                const { data, error } = await window.sbClient
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Fetch Users Error:', error);
                    return [];
                }
                return data;
            } catch (err) {
                return [];
            }
        },

        async registerUser(phone, pass, regDate) {
            try {
                const { data, error } = await window.sbClient
                    .from('users')
                    .insert([{ phone, pass, reg_date: regDate, isLoggedIn: false }])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Register User Error:', err);
                throw err;
            }
        },

        async deleteUser(id) {
            try {
                const { error } = await window.sbClient
                    .from('users')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Delete User Error:', err);
                throw err;
            }
        },

        async setLoginState(phone, isLoggedIn) {
            try {
                const { error } = await window.sbClient
                    .from('users')
                    .update({ isLoggedIn: isLoggedIn })
                    .eq('phone', phone);

                if (error) console.error('State Update Error:', error);
            } catch (err) {
                console.error('State Update Low Level Error:', err);
            }
        },

        async getFeedbacks() {
            try {
                const { data, error } = await window.sbClient
                    .from('feedbacks')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Fetch Feedback Error:', err);
                return [];
            }
        },

        async addFeedback(name, profit, date) {
            try {
                const { data, error } = await window.sbClient
                    .from('feedbacks')
                    .insert([{ user_name: name, profit: profit, date: date }])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Add Feedback Error:', err);
                throw err;
            }
        },

        async deleteFeedback(id) {
            try {
                const { error, count } = await window.sbClient
                    .from('feedbacks')
                    .delete({ count: 'exact' })
                    .eq('id', id);

                if (error) {
                    console.error('Supabase Delete Error:', error);
                    throw error;
                }

                if (count === 0) {
                    throw new Error('Permission Denied or Record Not Found. Please check Supabase RLS policies.');
                }

                return true;
            } catch (err) {
                console.error('Delete Feedback Logic Error:', err);
                throw err;
            }
        }
    };
}
