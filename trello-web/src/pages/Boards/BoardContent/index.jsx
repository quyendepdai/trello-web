import { Box } from '@mui/material'

function BoardContent() {
  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        height: (theme) => `calc(100vh - ${theme.trello.appBarHeight} - ${theme.trello.boardBarHeight})`,
      }}
    >
      Board Content
    </Box>
  )
}

export default BoardContent
