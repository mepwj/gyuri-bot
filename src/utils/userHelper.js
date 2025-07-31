/**
 * 사용자의 표시 이름을 가져오는 헬퍼 함수
 * 우선순위: 서버 닉네임 > 전역 닉네임 > 사용자명
 */
const getDisplayName = (interaction) => {
    // 슬래시 커맨드인 경우
    if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
        // 서버에서 실행된 경우 (DM이 아닌 경우)
        if (interaction.member) {
            // 서버 닉네임이 있으면 사용, 없으면 사용자명
            return interaction.member.displayName || interaction.user.username;
        }
        // DM인 경우
        return interaction.user.globalName || interaction.user.username;
    }
    
    // 일반 메시지인 경우
    if (interaction.member) {
        // 서버 닉네임이 있으면 사용, 없으면 사용자명
        return interaction.member.displayName || interaction.author.username;
    }
    
    // DM인 경우
    return interaction.author?.globalName || interaction.author?.username || '사용자';
};

module.exports = {
    getDisplayName
};