import Box from '@mui/material/Box'

import CardItem from './CardItem/CardItem'

function ListCards({ cards }) {
  return (
    <Box
      sx={{
        p: '0 5px',
        m: '0 5px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: (theme) =>
          `calc(${theme.trello.boardContentHeight} 
                 - ${theme.trello.columnHeaderHeight} 
                 - ${theme.trello.columnFooterHeight} 
                 - ${theme.spacing(5)})`,
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#ced0da' },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#bfc2cf',
        },
      }}
    >
      {/* Card Item */}
      {cards?.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </Box>
  )
}

export default ListCards
