document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-moderation-btn');
    if (!refreshBtn) {
        return;
    }

    const postsContainer = document.getElementById('moderation-pending-posts');
    const repliesContainer = document.getElementById('moderation-pending-replies');
    const reportsContainer = document.getElementById('moderation-open-reports');

    async function loadQueue() {
        postsContainer.innerHTML = '<p>Loading...</p>';
        repliesContainer.innerHTML = '';
        reportsContainer.innerHTML = '';

        const data = await apiCall('listmoderationqueue');
        if (data.error) {
            // Most likely an operator/non-privileged login — same pattern as every
            // other admin-gated command in this app, no special-casing here.
            postsContainer.innerHTML = `<p>${escapeHtml(data.error)}</p>`;
            return;
        }

        renderPendingPosts(data.pending_posts || []);
        renderPendingReplies(data.pending_replies || []);
        renderOpenReports(data.open_reports || []);
    }

    function renderPendingPosts(posts) {
        if (posts.length === 0) {
            postsContainer.innerHTML = '<h3>Pending Posts</h3><p>Nothing waiting on review.</p>';
            return;
        }
        let html = '<h3>Pending Posts</h3>';
        posts.forEach(p => {
            html += `
                <div class="moderation-item" style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:10px;">
                    <strong>${escapeHtml(p.title)}</strong> by ${escapeHtml(p.author_name)}
                    <p>${escapeHtml(p.body)}</p>
                    <p style="color:#a5680a;font-size:12px;">Boudica: ${escapeHtml(p.moderation_reason || 'no reason given')}</p>
                    <button class="call_action" data-action="approve-post" data-id="${p.id}" style="background-color:#3EDA95;">Approve</button>
                    <button class="call_action" data-action="reject-post" data-id="${p.id}" style="background-color:#e74c3c;">Reject</button>
                </div>
            `;
        });
        postsContainer.innerHTML = html;
    }

    function renderPendingReplies(replies) {
        if (replies.length === 0) {
            repliesContainer.innerHTML = '<h3>Pending Replies</h3><p>Nothing waiting on review.</p>';
            return;
        }
        let html = '<h3>Pending Replies</h3>';
        replies.forEach(r => {
            html += `
                <div class="moderation-item" style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:10px;">
                    <strong>Reply on post #${r.post_id}</strong> by ${escapeHtml(r.author_name)}
                    <p>${escapeHtml(r.body)}</p>
                    <p style="color:#a5680a;font-size:12px;">Boudica: ${escapeHtml(r.moderation_reason || 'no reason given')}</p>
                    <button class="call_action" data-action="approve-reply" data-id="${r.id}" style="background-color:#3EDA95;">Approve</button>
                    <button class="call_action" data-action="reject-reply" data-id="${r.id}" style="background-color:#e74c3c;">Reject</button>
                </div>
            `;
        });
        repliesContainer.innerHTML = html;
    }

    function renderOpenReports(reports) {
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<h3>Open Reports</h3><p>No open reports.</p>';
            return;
        }
        let html = '<h3>Open Reports</h3>';
        reports.forEach(r => {
            const target = r.post_id ? `post #${r.post_id}` : `reply #${r.reply_id}`;
            html += `
                <div class="moderation-item" style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:10px;">
                    <strong>Report on ${escapeHtml(target)}</strong>
                    <p>${escapeHtml(r.reason)}</p>
                    <p style="color:#999;font-size:12px;">Reported by: ${escapeHtml(r.reporter_email || 'anonymous')}</p>
                    <button class="call_action" data-action="resolve-report" data-id="${r.id}" style="background-color:#3EDA95;">Mark Reviewed</button>
                </div>
            `;
        });
        reportsContainer.innerHTML = html;
    }

    async function handleAction(action, id) {
        let result;
        if (action === 'approve-post') { result = await apiCall('moderatepost', { post_id: id, status: 'approved' }); }
        else if (action === 'reject-post') { result = await apiCall('moderatepost', { post_id: id, status: 'rejected' }); }
        else if (action === 'approve-reply') { result = await apiCall('moderatereply', { reply_id: id, status: 'approved' }); }
        else if (action === 'reject-reply') { result = await apiCall('moderatereply', { reply_id: id, status: 'rejected' }); }
        else if (action === 'resolve-report') { result = await apiCall('resolvereport', { report_id: id }); }
        else { return; }

        if (result.error) {
            showToast(result.error, 'error');
            return;
        }
        showToast(result.response, 'success');
        loadQueue();
    }

    document.getElementById('tab12').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) { return; }
        handleAction(btn.dataset.action, btn.dataset.id);
    });

    refreshBtn.addEventListener('click', loadQueue);
    loadQueue();
});
